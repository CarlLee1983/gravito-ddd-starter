interface SystemChecks {
    database: boolean;
    redis?: boolean;
    cache?: boolean;
}
interface Props {
    status: string;
    timestamp: string;
    checks: SystemChecks;
    message?: string;
}
export default function Dashboard({ status, timestamp, checks, message }: Props): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Dashboard.d.ts.map