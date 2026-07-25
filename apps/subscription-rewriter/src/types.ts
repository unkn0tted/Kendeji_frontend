export type RewriteRuleMatchMode = "range" | "ids";

export type RewriteRule = {
  id: string;
  name: string;
  match_mode: RewriteRuleMatchMode;
  start_id: number;
  end_id: number;
  subscriber_ids: number[];
  source_host: string;
  target_host: string;
  enabled: boolean;
  priority: number;
};

export type RewriterConfig = {
  public_base_url: string;
  public_base_urls: string[];
  origin_base_url: string;
  rules: RewriteRule[];
};

export type HostCount = {
  host: string;
  count: number;
};

export type HostMapping = {
  source_host: string;
  result_host: string;
  count: number;
  rewritten: boolean;
};

export type RewriteResult = {
  body: string;
  format: string;
  wrapped: "base64" | "none";
  changed: boolean;
  replacements: number;
  hosts: HostCount[];
  host_mappings: HostMapping[];
};

export type InspectionResult = {
  subscriber_id: number;
  format: string;
  wrapped: "base64" | "none";
  replacements: number;
  source_hosts: HostCount[];
  result_hosts: HostCount[];
  host_mappings: HostMapping[];
};
