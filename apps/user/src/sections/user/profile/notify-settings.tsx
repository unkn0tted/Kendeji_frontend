"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@workspace/ui/components/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@workspace/ui/components/form";
import { Switch } from "@workspace/ui/components/switch";
import { updateUserNotify } from "@workspace/ui/services/user/user";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { useGetUserInfo, useUser } from "@/stores/global";

const FormSchema = z.object({
  enable_balance_notify: z.boolean(),
  enable_login_notify: z.boolean(),
  enable_subscribe_notify: z.boolean(),
  enable_trade_notify: z.boolean(),
});

export default function NotifySettings() {
  const { t } = useTranslation("profile");
  const user = useUser();
  const getUserInfo = useGetUserInfo();
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    // `values` (not `defaultValues`) keeps the form in sync when the user
    // hydrates asynchronously, e.g. after a hard refresh.
    values: {
      enable_balance_notify: user?.enable_balance_notify ?? false,
      enable_login_notify: user?.enable_login_notify ?? false,
      enable_subscribe_notify: user?.enable_subscribe_notify ?? false,
      enable_trade_notify: user?.enable_trade_notify ?? false,
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    await updateUserNotify(data);
    toast.success(t("notify.updateSuccess", "Update Successful"));
    await getUserInfo();
  }

  return (
    <section className="rose-panel flex min-w-80 flex-col gap-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">
          {t("notify.notificationSettings", "Notification Settings")}
        </h2>
        <Button form="notify-form" size="sm" type="submit">
          {t("notify.save", "Save Changes")}
        </Button>
      </div>
      <div className="grid gap-6">
        <Form {...form}>
          <form
            className="space-y-4"
            id="notify-form"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <div className="space-y-4">
              {[
                {
                  name: "enable_balance_notify",
                  label: t("notify.balanceChange", "Balance Change"),
                },
                {
                  name: "enable_login_notify",
                  label: t("notify.login", "Login"),
                },
                {
                  name: "enable_subscribe_notify",
                  label: t("notify.subscribe", "Subscribe"),
                },
                {
                  name: "enable_trade_notify",
                  label: t("notify.finance", "Finance"),
                },
              ].map(({ name, label }) => (
                <FormField
                  control={form.control}
                  key={name}
                  name={name as any}
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between space-x-4">
                      <FormLabel className="text-muted-foreground">
                        {label}
                      </FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </form>
        </Form>
      </div>
    </section>
  );
}
