export interface ConnectedInstagramAccountRef {
  id: string;
}

export function isConnectedInstagramAccount(
  accounts: ConnectedInstagramAccountRef[],
  accountId: string | null | undefined
) {
  if (!accountId) return false;
  return accounts.some((account) => account.id === accountId);
}

export function resolveConnectedInstagramAccountId(
  accounts: ConnectedInstagramAccountRef[],
  currentAccountId: string | null | undefined,
  preferredAccountId?: string | null
) {
  if (isConnectedInstagramAccount(accounts, currentAccountId)) {
    return currentAccountId ?? "";
  }

  if (isConnectedInstagramAccount(accounts, preferredAccountId)) {
    return preferredAccountId ?? "";
  }

  return accounts[0]?.id ?? "";
}

export function automationMutationCustomerError(error?: string | null) {
  if (error === "INSTAGRAM_RECONNECT_REQUIRED") {
    return "That Instagram account is no longer connected. Reconnect it in Settings before activating this automation.";
  }

  return null;
}
