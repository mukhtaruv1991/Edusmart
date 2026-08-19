import { useStore } from '../../lib/store';
import ParentChildren from '../../components/dashboard/ParentChildren';

export default function ParentDashboard() {
  const { user, language } = useStore();

  return (
    <div className="space-y-6">
      <ParentChildren />
    </div>
  );
}
