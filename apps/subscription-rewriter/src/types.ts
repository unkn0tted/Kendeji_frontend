export type RewriteRule = {
  id: string;
  name: string;
  start_id: number;
  end_id: number;
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

export type RewriteResult = {
  body: string;
  format: string;
  wrapped: "base64" | "none";
  changed: boolean;
  replacements: number;
  hosts: HostCount[];
};

export type InspectionResult = {
  subscriber_id: number;
  format: string;
  wrapped: "base64" | "none";
  replacements: number;
  source_hosts: HostCount[];
  result_hosts: HostCount[];
};
