import { afterEach, describe, expect, test } from "bun:test";
import { useGlobalStore } from "../../apps/user/src/stores/global";

const initialState = useGlobalStore.getState();

afterEach(() => {
  useGlobalStore.setState({
    common: initialState.common,
    subscriptionLinkConfigStatus: initialState.subscriptionLinkConfigStatus,
  });
});

describe("subscription link generation guard", () => {
  test("returns no links while public configuration is loading or retrying", () => {
    useGlobalStore.setState({ subscriptionLinkConfigStatus: "loading" });
    expect(
      useGlobalStore
        .getState()
        .getUserSubscribe("user", "secret-token", "vless")
    ).toEqual([]);

    useGlobalStore.setState({ subscriptionLinkConfigStatus: "retrying" });
    expect(
      useGlobalStore
        .getState()
        .getUserSubscribe("user", "secret-token", "vless")
    ).toEqual([]);
  });

  test("never falls back to the internal domain after a public URL is declared", () => {
    useGlobalStore.setState((state) => ({
      common: {
        ...state.common,
        subscribe: {
          ...state.common.subscribe,
          public_subscribe_url: "://invalid-public-url",
          public_subscribe_urls: ["://invalid-public-url"],
          subscribe_domain: "internal-sub.example.com",
          subscribe_path: "/api/linkon",
        },
      },
      subscriptionLinkConfigStatus: "ready",
    }));

    expect(
      useGlobalStore
        .getState()
        .getUserSubscribe("user", "secret-token", "vless")
    ).toEqual([]);
  });
});
