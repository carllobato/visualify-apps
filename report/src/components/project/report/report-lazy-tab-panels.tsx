"use client";

import dynamic from "next/dynamic";
import { ReportModuleTabLoadingSkeleton } from "@/components/project/report/ReportModuleTabLoadingSkeleton";

const lazyTabLoading = () => <ReportModuleTabLoadingSkeleton />;

export const LazyReportProjectCostTabContent = dynamic(
  () =>
    import("@/components/project/report/ReportProjectCostTabContent").then(
      (mod) => mod.ReportProjectCostTabContent,
    ),
  { loading: lazyTabLoading },
);

export const LazyReportProjectTabContent = dynamic(
  () =>
    import("@/components/project/report/ReportProjectTabContent").then(
      (mod) => mod.ReportProjectTabContent,
    ),
  { loading: lazyTabLoading },
);

export const LazyReportProjectScheduleTabPanel = dynamic(
  () =>
    import("@/components/project/report/ReportProjectScheduleCard").then(
      (mod) => mod.ReportProjectScheduleCard,
    ),
  { loading: lazyTabLoading },
);

export const LazyReportProjectSettingsForm = dynamic(
  () =>
    import("@/components/project/report/ReportProjectSettingsForm").then(
      (mod) => mod.ReportProjectSettingsForm,
    ),
  { loading: lazyTabLoading },
);
