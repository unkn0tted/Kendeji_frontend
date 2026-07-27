import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@workspace/ui/components/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Icon } from "@workspace/ui/composed/icon";
import { Markdown } from "@workspace/ui/composed/markdown";
import { hasEmailSubaddress } from "@workspace/ui/utils/email";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { useCommon } from "@/stores/global";
import {
  getEmailDomainWhitelist,
  isEmailDomainAllowed,
  joinEmailAddress,
  splitEmailAddress,
} from "@/utils/email-domain";
import SendCode from "../send-code";
import type { TurnstileRef } from "../turnstile";
import CloudFlareTurnstile from "../turnstile";

export default function RegisterForm({
  loading,
  onSubmit,
  initialValues,
  setInitialValues,
  onSwitchForm,
}: {
  loading?: boolean;
  onSubmit: (data: any) => void;
  initialValues: any;
  setInitialValues: Dispatch<SetStateAction<any>>;
  onSwitchForm: Dispatch<SetStateAction<"register" | "reset" | "login">>;
}) {
  const { t } = useTranslation("auth");
  const common = useCommon();
  const { verify, auth, invite } = common;
  const domainWhitelist = useMemo(
    () => getEmailDomainWhitelist(auth.email.domain_suffix_list),
    [auth.email.domain_suffix_list]
  );
  const firstDomain = domainWhitelist.at(0) || "";
  const enableDomainWhitelist = auth.email.enable_domain_suffix;
  const useDomainSelect = enableDomainWhitelist && domainWhitelist.length > 0;
  const initialEmail = initialValues?.email || "";
  const { localPart: initialLocalPart, domain: initialDomain } =
    splitEmailAddress(initialEmail);
  const initialSelectedDomain =
    domainWhitelist.find((domain) => domain === initialDomain) || firstDomain;
  const defaultEmail = useDomainSelect
    ? joinEmailAddress(initialLocalPart, initialSelectedDomain)
    : initialEmail;

  const handleCheckUser = (email: string) => {
    try {
      if (!enableDomainWhitelist) return true;
      return isEmailDomainAllowed(email, domainWhitelist);
    } catch (error) {
      console.log("Error checking user:", error);
      return false;
    }
  };

  const formSchema = z
    .object({
      email: z
        .string()
        .email(t("register.email", "Please enter a valid email address"))
        .refine((email) => !hasEmailSubaddress(email), {
          message: t(
            "register.aliasEmail",
            "Email aliases using + cannot be registered. Existing accounts can still log in."
          ),
        })
        .refine(handleCheckUser, {
          message: t(
            "register.whitelist",
            "This email domain is not in the whitelist"
          ),
        }),
      password: z.string(),
      repeat_password: z.string(),
      code: auth.email.enable_verify
        ? z
            .string()
            .trim()
            .min(1, t("register.codeRequired", "Enter the verification code"))
        : z.string().nullish(),
      invite: invite.forced_invite ? z.string().min(1) : z.string().nullish(),
      cf_token:
        verify.enable_register_verify && verify.turnstile_site_key
          ? z.string()
          : z.string().nullish(),
    })
    .superRefine(({ password, repeat_password }, ctx) => {
      if (password !== repeat_password) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("register.passwordMismatch", "Passwords do not match"),
          path: ["repeat_password"],
        });
      }
    });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...initialValues,
      email: defaultEmail,
      invite: localStorage.getItem("invite") || "",
    },
  });
  const [selectedDomain, setSelectedDomain] = useState<string>(
    initialSelectedDomain
  );

  useEffect(() => {
    if (!useDomainSelect) {
      setSelectedDomain("");
      return;
    }

    const { domain, localPart } = splitEmailAddress(form.getValues("email"));
    const nextDomain = domainWhitelist.includes(domain) ? domain : firstDomain;

    setSelectedDomain(nextDomain);
    if (localPart) {
      const nextEmail = joinEmailAddress(localPart, nextDomain);
      if (form.getValues("email") !== nextEmail) {
        form.setValue("email", nextEmail, { shouldValidate: true });
      }
    }
  }, [domainWhitelist, firstDomain, form, useDomainSelect]);

  const buildWhitelistedEmail = (value: string, fallbackDomain: string) => {
    const { localPart, domain } = splitEmailAddress(value);
    const nextDomain = domainWhitelist.includes(domain)
      ? domain
      : fallbackDomain;

    return {
      domain: nextDomain,
      email: joinEmailAddress(localPart, nextDomain),
    };
  };

  const turnstile = useRef<TurnstileRef>(null);
  const handleSubmit = form.handleSubmit(
    (data) => {
      try {
        onSubmit(data);
      } catch (_error) {
        turnstile.current?.reset();
      }
    },
    () => {
      if (hasEmailSubaddress(form.getValues("email") || "")) {
        toast.error(
          t(
            "register.aliasEmail",
            "Email aliases using + cannot be registered. Existing accounts can still log in."
          )
        );
      }
    }
  );

  return (
    <>
      {auth.register.stop_register ? (
        <Markdown>
          {t("register.message", "Registration is currently disabled")}
        </Markdown>
      ) : (
        <Form {...form}>
          <form className="grid gap-6" onSubmit={handleSubmit}>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    {useDomainSelect ? (
                      <div className="flex">
                        <Input
                          className="rounded-r-none"
                          name={field.name}
                          onBlur={field.onBlur}
                          onChange={(event) => {
                            const { domain, email } = buildWhitelistedEmail(
                              event.target.value,
                              selectedDomain || firstDomain
                            );
                            setSelectedDomain(domain);
                            field.onChange(email);
                          }}
                          placeholder={t(
                            "placeholders.emailName",
                            "Enter email name..."
                          )}
                          type="text"
                          value={splitEmailAddress(field.value).localPart}
                        />
                        <Select
                          onValueChange={(domain) => {
                            setSelectedDomain(domain);
                            const { localPart } = splitEmailAddress(
                              field.value
                            );
                            field.onChange(joinEmailAddress(localPart, domain));
                            form.trigger("email");
                          }}
                          value={selectedDomain || firstDomain}
                        >
                          <SelectTrigger className="h-9 w-40 rounded-l-none border-l-0">
                            <SelectValue
                              placeholder={t(
                                "placeholders.emailSuffix",
                                "Select suffix"
                              )}
                            />
                          </SelectTrigger>
                          <SelectContent align="end">
                            {domainWhitelist.map((domain) => (
                              <SelectItem key={domain} value={domain}>
                                @{domain}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <Input
                        placeholder={t(
                          "placeholders.email",
                          "Enter your email..."
                        )}
                        type="email"
                        {...field}
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder={t(
                        "placeholders.password",
                        "Enter your password..."
                      )}
                      type="password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="repeat_password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      disabled={loading}
                      placeholder={t(
                        "placeholders.repeatPassword",
                        "Enter password again..."
                      )}
                      type="password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {auth.email.enable_verify && (
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input
                          disabled={loading}
                          placeholder={t("placeholders.code", "Enter code...")}
                          type="text"
                          {...field}
                          value={field.value as string}
                        />
                        <SendCode
                          disabled={
                            hasEmailSubaddress(form.watch("email") || "") ||
                            (enableDomainWhitelist &&
                              !isEmailDomainAllowed(
                                form.watch("email") || "",
                                domainWhitelist
                              ))
                          }
                          params={{
                            email: form.watch("email"),
                            type: 1,
                          }}
                          type="email"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="invite"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      disabled={loading || !!localStorage.getItem("invite")}
                      placeholder={t(
                        "register.invite",
                        "Invitation Code (Optional)"
                      )}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {verify.enable_register_verify && (
              <FormField
                control={form.control}
                name="cf_token"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <CloudFlareTurnstile
                        id="register"
                        {...field}
                        ref={turnstile}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <Button disabled={loading} type="submit">
              {loading && <Icon className="animate-spin" icon="mdi:loading" />}
              {t("register.title", "Register")}
            </Button>
          </form>
        </Form>
      )}
      <div className="mt-4 text-right text-sm">
        {t("register.existingAccount", "Already have an account?")}&nbsp;
        <Button
          className="p-0"
          onClick={() => {
            setInitialValues(undefined);
            onSwitchForm("login");
          }}
          variant="link"
        >
          {t("register.switchToLogin", "Login")}
        </Button>
      </div>
    </>
  );
}
