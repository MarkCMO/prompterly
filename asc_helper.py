import jwt, time, json, sys, urllib.request, urllib.error

KEY_ID = "YRMDQTX998"
ISSUER = "b7b9dd56-d867-4b33-b6e0-21e133f8bf12"
KEY_PATH = r"C:/Users/13219/Downloads/AuthKey_YRMDQTX998.p8"
APP_ID = "6775036750"
BASE = "https://api.appstoreconnect.apple.com"

with open(KEY_PATH) as f:
    PRIVATE_KEY = f.read()

def token():
    now = int(time.time())
    payload = {"iss": ISSUER, "iat": now, "exp": now + 20*60, "aud": "appstoreconnect-v1"}
    return jwt.encode(payload, PRIVATE_KEY, algorithm="ES256", headers={"kid": KEY_ID, "typ": "JWT"})

def req(method, path, body=None):
    url = path if path.startswith("http") else BASE + path
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header("Authorization", "Bearer " + token())
    r.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(r) as resp:
            txt = resp.read().decode()
            return resp.status, (json.loads(txt) if txt else {})
    except urllib.error.HTTPError as e:
        txt = e.read().decode()
        try: return e.code, json.loads(txt)
        except: return e.code, {"raw": txt}

def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "discover"

    VERSION_ID = "8e5904ba-95f2-4532-a4ae-80e8a67d8cc4"
    BUILD9_ID = "dace1089-807e-43d9-8af6-b543cb74f15c"

    if cmd == "cancel_sub":
        sub_id = sys.argv[2]
        s, r = req("PATCH", f"/v1/reviewSubmissions/{sub_id}", {
            "data": {"type": "reviewSubmissions", "id": sub_id, "attributes": {"canceled": True}}})
        print(json.dumps({"status": s, "state": r.get("data", {}).get("attributes", {}).get("state"), "resp": (r if s >= 400 else "ok")}, indent=2))
        return

    if cmd == "subs":
        # list ALL review submissions for the app with state + items
        s, subs = req("GET", f"/v1/reviewSubmissions?filter[app]={APP_ID}&limit=20")
        out = []
        for sub in subs.get("data", []):
            at = sub["attributes"]
            out.append({"id": sub["id"], "state": at.get("state"),
                        "platform": at.get("platform"), "submitted": at.get("submitted"),
                        "canceled": at.get("canceled")})
        print(json.dumps({"status": s, "subs": out, "raw": (subs if s >= 400 else None)}, indent=2))
        return

    if cmd == "attach":
        # attach an arbitrary build id to the version
        build_id = sys.argv[2]
        s, r = req("PATCH", f"/v1/appStoreVersions/{VERSION_ID}/relationships/build", {
            "data": {"type": "builds", "id": build_id}})
        print(json.dumps({"attach_status": s, "resp": (r if s >= 300 else "ok")}, indent=2))
        return

    if cmd == "create_sub":
        # create a fresh reviewSubmission for the platform, returns id
        s, r = req("POST", "/v1/reviewSubmissions", {
            "data": {"type": "reviewSubmissions",
                     "attributes": {"platform": "IOS"},
                     "relationships": {"app": {"data": {"type": "apps", "id": APP_ID}}}}})
        print(json.dumps({"status": s, "id": r.get("data", {}).get("id"), "resp": (r if s >= 300 else "ok")}, indent=2))
        return

    if cmd == "submit_sub":
        # mark a reviewSubmission as submitted
        sub_id = sys.argv[2]
        s, r = req("PATCH", f"/v1/reviewSubmissions/{sub_id}", {
            "data": {"type": "reviewSubmissions", "id": sub_id, "attributes": {"submitted": True}}})
        print(json.dumps({"status": s, "state": r.get("data", {}).get("attributes", {}).get("state"), "resp": (r if s >= 300 else "ok")}, indent=2))
        return

    if cmd == "add_item":
        # add an item (appStoreVersion or inAppPurchaseV2) to a reviewSubmission
        sub_id = sys.argv[2]
        kind = sys.argv[3]  # "version" or "iap"
        if kind == "version":
            rel = {"appStoreVersion": {"data": {"type": "appStoreVersions", "id": VERSION_ID}}}
        else:
            si, iaps = req("GET", f"/v1/apps/{APP_ID}/inAppPurchasesV2?limit=10")
            iap_id = iaps["data"][0]["id"]
            rel = {"inAppPurchaseV2": {"data": {"type": "inAppPurchases", "id": iap_id}}}
        rel["reviewSubmission"] = {"data": {"type": "reviewSubmissions", "id": sub_id}}
        s, r = req("POST", "/v1/reviewSubmissionItems", {
            "data": {"type": "reviewSubmissionItems", "relationships": rel}})
        print(json.dumps({"status": s, "id": r.get("data", {}).get("id"), "resp": (r if s >= 300 else "ok")}, indent=2))
        return

    if cmd == "reviewsub":
        s, subs = req("GET", f"/v1/apps/{APP_ID}/reviewSubmissions?limit=10&include=items&fields[reviewSubmissions]=state,platform,submitted")
        out = []
        for sub in subs.get("data", []):
            items = sub.get("relationships", {}).get("items", {}).get("data", [])
            si, idata = req("GET", f"/v1/reviewSubmissions/{sub['id']}/items?limit=50")
            itemtypes = []
            for it in idata.get("data", []):
                rel = it.get("relationships", {})
                kinds = [k for k, vv in rel.items() if vv.get("data")]
                itemtypes.append({k: rel[k]["data"].get("type") if rel[k].get("data") else None for k in kinds})
            out.append({"id": sub["id"], "state": sub["attributes"].get("state"),
                        "submitted": sub["attributes"].get("submitted"), "items": itemtypes})
        print(json.dumps(out, indent=2))
        return

    if cmd == "add_iap_to_sub":
        # find open (not yet submitted) reviewSubmission, add the IAP as an item
        sub_id = sys.argv[2]
        s, iaps = req("GET", f"/v1/apps/{APP_ID}/inAppPurchasesV2?limit=10")
        iap_id = iaps["data"][0]["id"]
        s, r = req("POST", "/v1/reviewSubmissionItems", {
            "data": {"type": "reviewSubmissionItems",
                     "relationships": {
                         "reviewSubmission": {"data": {"type": "reviewSubmissions", "id": sub_id}},
                         "inAppPurchaseV2": {"data": {"type": "inAppPurchases", "id": iap_id}}}}})
        print(json.dumps({"status": s, "resp": r}, indent=2))
        return

    if cmd == "status":
        out = {}
        s, v = req("GET", f"/v1/appStoreVersions/{VERSION_ID}?include=build,appStoreReviewDetail&fields[appStoreVersions]=appStoreState,versionString")
        out["version"] = v.get("data", {}).get("attributes")
        inc = {i["type"]: i for i in v.get("included", [])}
        out["build_linked"] = "builds" in inc
        if "builds" in inc: out["build_number"] = inc["builds"]["attributes"].get("version")
        out["review_detail_linked"] = "appStoreReviewDetails" in inc
        # IAP state
        s, iaps = req("GET", f"/v1/apps/{APP_ID}/inAppPurchasesV2?limit=10&fields[inAppPurchases]=name,productId,state,reviewNote")
        out["iaps"] = [{"name": i["attributes"].get("name"), "productId": i["attributes"].get("productId"), "state": i["attributes"].get("state")} for i in iaps.get("data", [])]
        # content rights + price
        s, app = req("GET", f"/v1/apps/{APP_ID}?fields[apps]=contentRightsDeclaration")
        out["contentRights"] = app.get("data", {}).get("attributes", {}).get("contentRightsDeclaration")
        s, ps = req("GET", f"/v1/apps/{APP_ID}/appPriceSchedule")
        out["has_price_schedule"] = s == 200
        print(json.dumps(out, indent=2))
        return

    if cmd == "inspect_ss":
        s, locs = req("GET", f"/v1/appStoreVersions/{VERSION_ID}/appStoreVersionLocalizations?limit=50")
        out = []
        for l in locs.get("data", []):
            lid = l["id"]; loc = l["attributes"]["locale"]
            s, sets = req("GET", f"/v1/appStoreVersionLocalizations/{lid}/appScreenshotSets?limit=50&include=appScreenshots")
            for st in sets.get("data", []):
                shots = []
                s2, sh = req("GET", f"/v1/appScreenshotSets/{st['id']}/appScreenshots?limit=50")
                for x in sh.get("data", []):
                    a = x["attributes"]
                    shots.append({"id": x["id"], "fileName": a.get("fileName"),
                                  "state": a.get("assetDeliveryState", {}).get("state"),
                                  "errors": a.get("assetDeliveryState", {}).get("errors")})
                out.append({"locale": loc, "displayType": st["attributes"]["screenshotDisplayType"],
                            "set_id": st["id"], "shots": shots})
        # also test creating an iphone67 set to see error
        print(json.dumps(out, indent=2))
        return

    if cmd == "delete_ss":
        # delete all screenshots + sets for en-US so we can re-upload cleanly
        s, locs = req("GET", f"/v1/appStoreVersions/{VERSION_ID}/appStoreVersionLocalizations?limit=50")
        log = []
        for l in locs.get("data", []):
            lid = l["id"]
            s, sets = req("GET", f"/v1/appStoreVersionLocalizations/{lid}/appScreenshotSets?limit=50")
            for st in sets.get("data", []):
                s2, sh = req("GET", f"/v1/appScreenshotSets/{st['id']}/appScreenshots?limit=50")
                for x in sh.get("data", []):
                    sd, _ = req("DELETE", f"/v1/appScreenshots/{x['id']}")
                    log.append({"del_shot": x["id"], "status": sd})
                sd, _ = req("DELETE", f"/v1/appScreenshotSets/{st['id']}")
                log.append({"del_set": st["id"], "type": st["attributes"]["screenshotDisplayType"], "status": sd})
        print(json.dumps(log, indent=2))
        return

    if cmd == "screenshots":
        import os, hashlib
        SDIR = r"C:/Users/13219/Desktop/Prompterly/store-assets/screenshots/"
        plan = {
            "APP_IPHONE_67": ["p-00-hero.png","p-01-library.png","p-02-editor.png","p-03-teleprompter.png","p-04-settings.png","p-05-guide.png"],
            "APP_IPAD_PRO_3GEN_129": ["ipad-00-hero.png","ipad-01-library.png","ipad-02-editor.png","ipad-03-teleprompter.png","ipad-04-settings.png","ipad-05-guide.png"],
        }
        # locale
        s, locs = req("GET", f"/v1/appStoreVersions/{VERSION_ID}/appStoreVersionLocalizations?limit=50")
        loc_id = None
        for l in locs.get("data", []):
            if l["attributes"]["locale"] in ("en-US","en-GB"):
                loc_id = l["id"];
                if l["attributes"]["locale"] == "en-US": break
        if not loc_id and locs.get("data"): loc_id = locs["data"][0]["id"]
        report = {"locale_id": loc_id, "sets": {}}

        # existing sets
        s, exsets = req("GET", f"/v1/appStoreVersionLocalizations/{loc_id}/appScreenshotSets?limit=50")
        bytype = {x["attributes"]["screenshotDisplayType"]: x["id"] for x in exsets.get("data", [])}

        for dtype, files in plan.items():
            set_id = bytype.get(dtype)
            if not set_id:
                s, r = req("POST", "/v1/appScreenshotSets", {
                    "data": {"type": "appScreenshotSets",
                             "attributes": {"screenshotDisplayType": dtype},
                             "relationships": {"appStoreVersionLocalization": {"data": {"type": "appStoreVersionLocalizations", "id": loc_id}}}}})
                set_id = r.get("data", {}).get("id")
            res = []
            for fn in files:
                path = SDIR + fn
                blob = open(path, "rb").read()
                # reserve
                s, r = req("POST", "/v1/appScreenshots", {
                    "data": {"type": "appScreenshots",
                             "attributes": {"fileName": fn, "fileSize": len(blob)},
                             "relationships": {"appScreenshotSet": {"data": {"type": "appScreenshotSets", "id": set_id}}}}})
                if s not in (200, 201):
                    res.append({fn: ("reserve", s, r)}); continue
                ss = r["data"]; sid = ss["id"]
                ops = ss["attributes"]["uploadOperations"]
                ok = True
                for op in ops:
                    chunk = blob[op["offset"]: op["offset"] + op["length"]]
                    pr = urllib.request.Request(op["url"], data=chunk, method=op["method"])
                    for h in op.get("requestHeaders", []):
                        pr.add_header(h["name"], h["value"])
                    try:
                        urllib.request.urlopen(pr)
                    except urllib.error.HTTPError as e:
                        ok = False; res.append({fn: ("put", e.code, e.read().decode()[:200])}); break
                if not ok: continue
                md5 = hashlib.md5(blob).hexdigest()
                s, r = req("PATCH", f"/v1/appScreenshots/{sid}", {
                    "data": {"type": "appScreenshots", "id": sid,
                             "attributes": {"uploaded": True, "sourceFileChecksum": md5}}})
                res.append({fn: ("commit", s)})
            report["sets"][dtype] = {"set_id": set_id, "uploads": res}
        print(json.dumps(report, indent=2))
        return

    if cmd == "contact":
        phone = sys.argv[2]
        attrs = {
            "contactFirstName": "Mark", "contactLastName": "Gabrielli",
            "contactEmail": "mark@markcmo.com", "contactPhone": phone,
            "demoAccountRequired": False,
            "notes": "No account or login required. All features are available immediately; the in-app purchase (Unlock Prompterly) unlocks unlimited recording after the free sessions are used. Restore Purchases is on the paywall."}
        s, ex = req("GET", f"/v1/appStoreVersions/{VERSION_ID}/appStoreReviewDetail")
        existing = ex.get("data")
        if existing:
            s, r = req("PATCH", f"/v1/appStoreReviewDetails/{existing['id']}",
                       {"data": {"type": "appStoreReviewDetails", "id": existing["id"], "attributes": attrs}})
        else:
            s, r = req("POST", "/v1/appStoreReviewDetails", {
                "data": {"type": "appStoreReviewDetails", "attributes": attrs,
                         "relationships": {"appStoreVersion": {"data": {"type": "appStoreVersions", "id": VERSION_ID}}}}})
        print(json.dumps({"review_contact": s, "resp": r if s not in (200,201) else "ok"}, indent=2))
        return

    if cmd == "apply":
        results = {}

        # 1) Content rights: does not use third-party content
        s, r = req("PATCH", f"/v1/apps/{APP_ID}", {
            "data": {"type": "apps", "id": APP_ID,
                     "attributes": {"contentRightsDeclaration": "DOES_NOT_USE_THIRD_PARTY_CONTENT"}}})
        results["content_rights"] = s

        # 2) Attach build 9 to the version
        s, r = req("PATCH", f"/v1/appStoreVersions/{VERSION_ID}/relationships/build", {
            "data": {"type": "builds", "id": BUILD9_ID}})
        results["build_attach"] = s if s != 422 else (s, r)

        # 3) Pricing -> free. Find USA $0 price point.
        s, pp = req("GET", f"/v1/apps/{APP_ID}/appPricePoints?filter[territory]=USA&limit=200&include=territory")
        free_id = None
        for p in pp.get("data", []):
            if p["attributes"].get("customerPrice") in ("0", "0.0", "0.00"):
                free_id = p["id"]; break
        results["free_price_point"] = free_id
        if free_id:
            body = {
                "data": {"type": "appPriceSchedules",
                    "relationships": {
                        "app": {"data": {"type": "apps", "id": APP_ID}},
                        "baseTerritory": {"data": {"type": "territories", "id": "USA"}},
                        "manualPrices": {"data": [{"type": "appPrices", "id": "${price1}"}]}}},
                "included": [{"type": "appPrices", "id": "${price1}",
                    "attributes": {"startDate": None, "endDate": None},
                    "relationships": {"appPricePoint": {"data": {"type": "appPricePoints", "id": free_id}}}}]}
            s, r = req("POST", "/v1/appPriceSchedules", body)
            results["pricing_free"] = s if s in (200, 201) else (s, r)

        # 4) App Review contact info
        phone = sys.argv[2] if len(sys.argv) > 2 else None
        s, ex = req("GET", f"/v1/appStoreVersions/{VERSION_ID}/appStoreReviewDetail")
        attrs = {
            "contactFirstName": "Mark", "contactLastName": "Gabrielli",
            "contactEmail": "mark@markcmo.com", "demoAccountRequired": False,
            "notes": "No account or login required. All features are available immediately; the in-app purchase (Unlock Prompterly) unlocks unlimited recording after the free sessions are used. Restore Purchases is on the paywall."}
        if phone: attrs["contactPhone"] = phone
        existing = ex.get("data")
        if existing:
            s, r = req("PATCH", f"/v1/appStoreReviewDetails/{existing['id']}",
                       {"data": {"type": "appStoreReviewDetails", "id": existing["id"], "attributes": attrs}})
        else:
            s, r = req("POST", "/v1/appStoreReviewDetails", {
                "data": {"type": "appStoreReviewDetails", "attributes": attrs,
                         "relationships": {"appStoreVersion": {"data": {"type": "appStoreVersions", "id": VERSION_ID}}}}})
        results["review_contact"] = s if s in (200, 201) else (s, r)

        print(json.dumps(results, indent=2))
        return

    if cmd == "discover":
        out = {}
        s, app = req("GET", f"/v1/apps/{APP_ID}?fields[apps]=name,contentRightsDeclaration")
        out["app"] = {"status": s, "attrs": app.get("data", {}).get("attributes")}
        # versions
        s, vs = req("GET", f"/v1/apps/{APP_ID}/appStoreVersions?filter[appStoreState]=PREPARE_FOR_SUBMISSION,DEVELOPER_REJECTED,REJECTED,METADATA_REJECTED&limit=5&fields[appStoreVersions]=versionString,appStoreState,platform")
        out["versions"] = [{"id": v["id"], **v["attributes"]} for v in vs.get("data", [])]
        # all versions fallback
        if not out["versions"]:
            s, vs = req("GET", f"/v1/apps/{APP_ID}/appStoreVersions?limit=10&fields[appStoreVersions]=versionString,appStoreState,platform")
            out["versions_all"] = [{"id": v["id"], **v["attributes"]} for v in vs.get("data", [])]
        # builds
        s, bs = req("GET", f"/v1/builds?filter[app]={APP_ID}&limit=5&sort=-version&fields[builds]=version,processingState,uploadedDate")
        out["builds"] = [{"id": b["id"], **b["attributes"]} for b in bs.get("data", [])]
        # price schedule
        s, ps = req("GET", f"/v1/apps/{APP_ID}/appPriceSchedule?include=manualPrices,baseTerritory")
        out["priceSchedule_status"] = s
        out["priceSchedule"] = ps.get("data") if s == 200 else ps
        print(json.dumps(out, indent=2))

if __name__ == "__main__":
    main()
