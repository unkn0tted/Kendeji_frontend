import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@workspace/ui/components/table";
import { useTranslation } from "react-i18next";
import EmailBroadcastForm from "./email/broadcast-form";
import EmailTaskManager from "./email/task-manager";
import QuotaBroadcastForm from "./quota/broadcast-form";
import QuotaTaskManager from "./quota/task-manager";

export default function MarketingPage() {
  const { t } = useTranslation("marketing");

  const formSections = [
    {
      title: t("emailMarketing", "Email Marketing"),
      forms: [
        { component: EmailBroadcastForm },
        { component: EmailTaskManager, viewable: true },
      ],
    },
    {
      title: t("quotaService", "Quota Service"),
      forms: [
        { component: QuotaBroadcastForm },
        { component: QuotaTaskManager, viewable: true },
      ],
    },
  ];

  return (
    <>
      <div className="space-y-3 md:hidden">
        {formSections.map((section, sectionIndex) => (
          <section className="rounded-md border bg-card p-4" key={sectionIndex}>
            <h2 className="border-b pb-3 font-semibold text-base">
              {section.title}
            </h2>
            <div className="divide-y divide-border/60">
              {section.forms.map((form, formIndex) => {
                const FormComponent = form.component;
                return (
                  <div
                    className={
                      form.viewable
                        ? "py-3 last:pb-0"
                        : "py-3 last:pb-0 [&_[data-slot=sheet-trigger]>svg:last-child]:hidden [&_[data-slot=sheet-trigger]]:cursor-default"
                    }
                    inert={!form.viewable}
                    key={formIndex}
                  >
                    <FormComponent />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <div className="hidden space-y-8 md:block">
        {formSections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            <h2 className="mb-4 font-semibold text-lg">{section.title}</h2>
            <Table>
              <TableBody>
                {section.forms.map((form, formIndex) => {
                  const FormComponent = form.component;
                  return (
                    <TableRow key={formIndex}>
                      <TableCell>
                        <FormComponent />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ))}
      </div>
    </>
  );
}
