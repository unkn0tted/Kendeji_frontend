"use client";

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
import { updateUserPassword } from "@workspace/ui/services/user/user";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

export default function ChangePassword() {
  const { t } = useTranslation("profile");
  const FormSchema = z
    .object({
      password: z.string().min(6),
      repeat_password: z.string(),
    })
    .refine((data) => data.password === data.repeat_password, {
      message: t("accountSettings.passwordMismatch", "Passwords do not match"),
      path: ["repeat_password"],
    });

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    await updateUserPassword({ password: data.password });
    toast.success(t("accountSettings.updateSuccess", "Update Successful"));
    form.reset();
  }

  return (
    <section className="rose-panel flex min-w-80 flex-col gap-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">
          {t("accountSettings.accountSettings", "Password Settings")}
        </h2>
        <Button form="password-form" size="sm" type="submit">
          {t("accountSettings.updatePassword", "Update Password")}
        </Button>
      </div>
      <div>
        <Form {...form}>
          <form
            className="space-y-4"
            id="password-form"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder={t(
                        "accountSettings.newPassword",
                        "New Password"
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
                      placeholder={t(
                        "accountSettings.repeatNewPassword",
                        "Repeat New Password"
                      )}
                      type="password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </div>
    </section>
  );
}
