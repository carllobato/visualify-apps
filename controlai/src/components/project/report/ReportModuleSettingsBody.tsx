import { Card, CardBody } from "@visualify/design-system";
import { REPORT_SETTINGS_MOCK } from "@/components/project/report/report-mock-data";

const sectionTitleClass =
  "m-0 text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]";

function SettingsSection({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <Card className="min-w-0">
      <CardBody className="flex flex-col gap-1.5 py-3">
        <h3 className={sectionTitleClass}>{title}</h3>
        <p className="m-0 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">
          {value}
        </p>
        <p className="m-0 text-[length:var(--ds-text-xs)] leading-relaxed text-[var(--ds-text-muted)]">
          {description}
        </p>
      </CardBody>
    </Card>
  );
}

export function ReportModuleSettingsBody() {
  const settings = REPORT_SETTINGS_MOCK;

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
        Report template and publishing configuration. Settings are mock-only until report snapshots
        are connected.
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SettingsSection
          title="Reporting cadence"
          value={settings.reportingCadence}
          description="Frequency for weekly controls packs and monthly gateway reporting."
        />
        <SettingsSection
          title="Default report template"
          value={settings.defaultTemplate}
          description="Excel/PPT template applied on upload for parsing and dashboard mapping."
        />
        <SettingsSection
          title="Dashboard visibility"
          value={settings.dashboardVisibility}
          description="Roles and groups that can view published snapshots."
        />
        <SettingsSection
          title="Approval workflow"
          value={settings.approvalWorkflow}
          description="Steps required before a snapshot is published to the executive dashboard."
        />
      </div>
    </div>
  );
}
