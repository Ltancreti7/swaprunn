import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Check, Circle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '@/lib/api';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
}

interface OnboardingChecklistProps {
  role: 'dealer' | 'sales' | 'driver';
  onComplete?: () => void;
}

const dealerChecklist: ChecklistItem[] = [
  {
    id: 'profile_complete',
    title: 'Complete your dealership profile',
    description: 'Add your dealership address and contact information',
  },
  {
    id: 'invite_sales',
    title: 'Invite sales staff',
    description: 'Add your sales team members to start requesting deliveries',
  },
  {
    id: 'approve_driver',
    title: 'Approve your first driver',
    description: 'Review and approve driver applications to build your delivery network',
  },
  {
    id: 'create_delivery',
    title: 'Create your first delivery',
    description: 'Post a delivery job to see how the system works',
  },
];

const salesChecklist: ChecklistItem[] = [
  {
    id: 'profile_complete',
    title: 'Complete your profile',
    description: 'Add your contact information and default pickup location',
  },
  {
    id: 'create_delivery',
    title: 'Create your first delivery request',
    description: 'Submit a vehicle delivery request for your dealership',
  },
  {
    id: 'track_delivery',
    title: 'Track a delivery',
    description: 'Follow the progress of an active delivery in real-time',
  },
];

const driverChecklist: ChecklistItem[] = [
  {
    id: 'profile_complete',
    title: 'Complete your driver profile',
    description: 'Add your vehicle information and service radius',
  },
  {
    id: 'apply_dealer',
    title: 'Apply to a dealership',
    description: 'Send an application to start receiving delivery jobs',
  },
  {
    id: 'accept_delivery',
    title: 'Accept your first delivery',
    description: 'Pick up a delivery job from an approved dealership',
  },
  {
    id: 'complete_delivery',
    title: 'Complete a delivery',
    description: 'Finish your first delivery to build your reputation',
  },
];

const getChecklistForRole = (role: 'dealer' | 'sales' | 'driver'): ChecklistItem[] => {
  switch (role) {
    case 'dealer':
      return dealerChecklist;
    case 'sales':
      return salesChecklist;
    case 'driver':
      return driverChecklist;
    default:
      return [];
  }
};

export function OnboardingChecklist({ role, onComplete }: OnboardingChecklistProps) {
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  const checklist = getChecklistForRole(role);
  const progress = Math.round((completedSteps.length / checklist.length) * 100);
  const isComplete = completedSteps.length === checklist.length;

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const response = await api.onboarding.getProgress();
      if (response.progress) {
        setCompletedSteps(response.progress.completedSteps || []);
        setDismissed(response.progress.dismissed || false);
      }
    } catch (error) {
      console.error('Failed to load onboarding progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const markStepComplete = async (stepId: string) => {
    if (completedSteps.includes(stepId)) return;
    
    const newCompletedSteps = [...completedSteps, stepId];
    setCompletedSteps(newCompletedSteps);
    
    try {
      await api.onboarding.updateProgress({ completedSteps: newCompletedSteps });
      
      if (newCompletedSteps.length === checklist.length && onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Failed to update onboarding progress:', error);
      setCompletedSteps(completedSteps);
    }
  };

  const handleDismiss = async () => {
    setDismissed(true);
    try {
      await api.onboarding.updateProgress({ dismissed: true });
    } catch (error) {
      console.error('Failed to dismiss onboarding:', error);
    }
  };

  if (loading || dismissed || isComplete) {
    return null;
  }

  return (
    <Card className="mb-4 border-l-4 border-l-primary" data-testid="card-onboarding-checklist">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-medium">Getting Started</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {progress}% complete
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsCollapsed(!isCollapsed)}
            data-testid="button-toggle-checklist"
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDismiss}
            data-testid="button-dismiss-onboarding"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent className="pt-0">
          <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <ul className="space-y-2">
            {checklist.map((item) => {
              const isStepComplete = completedSteps.includes(item.id);
              return (
                <li
                  key={item.id}
                  className="flex items-start gap-3 rounded-md p-2 hover-elevate"
                  data-testid={`checklist-item-${item.id}`}
                >
                  <button
                    onClick={() => markStepComplete(item.id)}
                    className="mt-0.5 flex-shrink-0"
                    disabled={isStepComplete}
                    data-testid={`button-complete-${item.id}`}
                  >
                    {isStepComplete ? (
                      <Check className="h-5 w-5 text-primary" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isStepComplete ? 'line-through text-muted-foreground' : ''}`}>
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
