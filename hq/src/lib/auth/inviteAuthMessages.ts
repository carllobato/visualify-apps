/** User-facing copy for `?invite_error=` on the login page. */
export function inviteErrorUserMessage(inviteError: string | undefined): string | undefined {
  if (!inviteError?.trim()) return undefined;
  switch (inviteError.trim().toLowerCase()) {
    case "email_mismatch":
      return "This invitation was sent to a different email address. Sign in with the invited email or create an account using that address.";
    case "expired":
      return "This invitation has expired. Ask your workspace admin to send a new invite.";
    case "invalid_invitation":
      return "This invitation link is invalid or no longer available.";
    case "service_role_missing":
      return "Invitation acceptance is temporarily unavailable. Please try again later.";
    case "membership_insert_failed":
      return "We could not add you to the workspace. Please try again or contact support.";
    case "invite_token_required":
      return "A valid invitation link is required.";
    case "email_required":
      return "Your account must have an email address to accept this invitation.";
    case "conflict":
    case "invitation_already_used":
      return "This invitation has already been used by another account.";
    case "unsupported_invitation":
      return "This invitation type is not supported on HQ.";
    case "profile_failed":
      return "We could not prepare your account profile. Please try again.";
    case "not_authenticated":
      return "Sign in to accept your invitation.";
    default:
      return "We could not accept this invitation. Please try again.";
  }
}
