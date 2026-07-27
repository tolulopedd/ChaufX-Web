package com.chaufx.chaufxcustomer;

// Compatibility bridge for stale generated references that still point at the
// legacy customer Android package during local release builds.
public final class BuildConfig {
  public static final boolean IS_NEW_ARCHITECTURE_ENABLED =
    ca.chaufx.customer.BuildConfig.IS_NEW_ARCHITECTURE_ENABLED;

  public static final boolean IS_EDGE_TO_EDGE_ENABLED =
    ca.chaufx.customer.BuildConfig.IS_EDGE_TO_EDGE_ENABLED;

  private BuildConfig() {}
}
