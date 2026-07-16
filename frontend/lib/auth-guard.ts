import { ApiError } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

/** Block mutations/queries when there is no authenticated user. */
export function assertAuthenticated() {
  const { user, accessToken, isLoading } = useAuthStore.getState();
  if (isLoading) {
    throw new ApiError("Session is still loading. Try again in a moment.", 401);
  }
  if (!user || !accessToken) {
    throw new ApiError("You must be signed in to do that.", 401);
  }
  return user;
}

/** Wrap a mutation function with auth pre-check. */
export function withAuthGuard<TArgs, TResult>(
  fn: (args: TArgs) => Promise<TResult>,
): (args: TArgs) => Promise<TResult> {
  return (args: TArgs) => {
    assertAuthenticated();
    return fn(args);
  };
}
