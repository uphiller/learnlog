export const ONBOARDING_PROFILE_KEY = "ofme.onboarding.profile";
export const ONBOARDING_DISMISSED_KEY = "ofme.onboarding.dismissed";
export const ONBOARDING_UPDATED_EVENT = "ofme:onboarding-updated";

export function isOnboardingProfileDone(): boolean {
  return localStorage.getItem(ONBOARDING_PROFILE_KEY) === "true";
}

export function isOnboardingDismissed(): boolean {
  return localStorage.getItem(ONBOARDING_DISMISSED_KEY) === "true";
}

export function markOnboardingProfileDone(): void {
  localStorage.setItem(ONBOARDING_PROFILE_KEY, "true");
  dispatchOnboardingUpdated();
}

export function dismissOnboarding(): void {
  localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
  dispatchOnboardingUpdated();
}

export function dispatchOnboardingUpdated(): void {
  window.dispatchEvent(new Event(ONBOARDING_UPDATED_EVENT));
}
