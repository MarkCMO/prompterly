# Prompterly — Resubmission after rejection (Submission 1c7e2851)

Apple flagged two issues. Both are fixed in code; the subscription one also
needs ONE manual step in App Store Connect (the API physically cannot do it).

---

## What Apple flagged

1. **Guideline 5.1.1(iv)** — the camera-permission button said "Grant access",
   which Apple reads as forcing a login/registration to use the app.
2. **Guideline 2.1(b)** — the reviewer "cannot locate the In-App Purchases,
   such as Unlock Prompterly". The paywall was only reachable after 5
   teleprompter sessions, AND the subscriptions were never attached to the
   review, so they didn't exist in the reviewer's sandbox build.

---

## What I fixed in the app (now in the new build)

- **5.1.1(iv):** camera button text changed `Grant access` → `Continue`
  (`app/teleprompter/[id].tsx`).
- **2.1(b) discoverability:** added an always-visible **"Unlock Prompterly Pro"**
  row at the top of **Settings** that opens the paywall directly. The reviewer
  no longer has to run 5 sessions to find the purchases.
- New build built in-house and uploaded to App Store Connect, then attached to
  the 1.0.0 version (replacing the rejected build 13).

---

## The ONE manual step (required — API cannot do this)

The subscriptions are sitting in **Ready to Submit** but were never bundled
into the review. The App Store Connect API has no relationship to attach a
subscription to a review submission, so this must be done in the UI:

1. Go to **App Store Connect → Apps → Prompterly → the 1.0.0 version** (the
   rejected one — it's editable).
2. Scroll to **"In-App Purchases and Subscriptions"** on the version page.
3. Click the **+** (or "Add Subscription") and select BOTH:
   - **Prompterly Pro Weekly** (`com.markcmo.prompterly.weekly`)
   - **Prompterly Pro Monthly** (`com.markcmo.prompterly.monthly`)
4. Confirm the new build is attached (it should already say the latest build).
5. Click **Add for Review → Submit to App Review**.

After submitting, both subscriptions flip from **Ready to Submit** →
**Waiting for Review**. That's the signal it worked. (I'll verify via API too.)

---

## Reply to paste into Apple's Resolution Center message

> Hi, thank you for the review.
>
> 5.1.1(iv): We changed the camera-permission button label from "Grant access"
> to "Continue". No account, login, or registration is required to use
> Prompterly — the app is fully usable without signing in.
>
> 2.1(b): The In-App Purchases are now included with this build and submitted
> for review alongside it. To locate them in the app:
> 1. Open the app and tap the **Settings** tab.
> 2. At the top you'll see **"Unlock Prompterly Pro"** — tap it to open the
>    paywall showing the **Prompterly Pro Weekly** and **Prompterly Pro Monthly**
>    subscriptions.
> The paywall also appears automatically after 5 teleprompter sessions.
>
> Thank you.
