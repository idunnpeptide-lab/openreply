export function accountLimitRecoveryMessage() {
  return "Your plan has no free social-account slots. Reconnecting an already-linked account uses its existing slot. To connect a different account, use available plan capacity, upgrade, or contact support for a controlled migration.";
}

export function instagramDisconnectCustomerError(
  responseOk: boolean,
  success: boolean | undefined
) {
  if (responseOk && success === true) return null;

  return "ReplyHalo could not disconnect this Instagram account. Nothing was changed. Please try again.";
}
