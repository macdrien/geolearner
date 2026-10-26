import type { ReactNode } from "react";
import Brand from "./brand";
import styles from "../page.module.css";

export default function DashboardHeader({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <header className={styles.dashboardHeader}>
      <Brand />
      <div className={styles.headerActions}>{children}</div>
    </header>
  );
}
