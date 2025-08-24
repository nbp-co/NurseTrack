import { Edit2, ChevronRight, DollarSign, Clock, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Contract } from "@/types";

interface ContractCardProps {
  contract: Contract;
  onEdit: () => void;
  onViewDetails?: () => void;
}

export function ContractCard({ contract, onEdit, onViewDetails }: ContractCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return `${start.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })} - ${end.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'planned': return 'secondary';
      case 'completed': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getDaysOfWeek = (byDay: string[]) => {
    const dayMap: Record<string, string> = {
      'SUN': 'Sun', 'MON': 'Mon', 'TUE': 'Tue', 
      'WED': 'Wed', 'THU': 'Thu', 'FRI': 'Fri', 'SAT': 'Sat'
    };
    
    return byDay.map(day => dayMap[day] || day);
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <h3 className="text-lg font-semibold text-gray-900" data-testid={`text-contract-facility-${contract.id}`}>
                {contract.facility}
              </h3>
              <Badge 
                variant={getStatusColor(contract.status)}
                data-testid={`badge-contract-status-${contract.id}`}
              >
                {getStatusLabel(contract.status)}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500 flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Role
                </p>
                <p className="font-medium text-gray-900" data-testid={`text-contract-role-${contract.id}`}>
                  {contract.role}
                </p>
              </div>
              <div>
                <p className="text-gray-500 flex items-center">
                  <DollarSign className="w-4 h-4 mr-1" />
                  Rate
                </p>
                <p className="font-medium text-gray-900" data-testid={`text-contract-rate-${contract.id}`}>
                  {formatCurrency(contract.baseRate)}/{contract.payType === 'hourly' ? 'hour' : 'salary'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Duration
                </p>
                <p className="font-medium text-gray-900" data-testid={`text-contract-duration-${contract.id}`}>
                  {formatDateRange(contract.startDate, contract.endDate)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  Weekly Hours
                </p>
                <p className="font-medium text-gray-900" data-testid={`text-contract-hours-${contract.id}`}>
                  {contract.weeklyHours} hours
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              data-testid={`button-edit-contract-${contract.id}`}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            {onViewDetails && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onViewDetails}
                data-testid={`button-view-contract-${contract.id}`}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Schedule Preview */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm font-medium text-gray-700 mb-2">Schedule</p>
          <div className="flex space-x-2">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => {
              const isWorkDay = contract.recurrence.byDay.includes(day as any);
              return (
                <div
                  key={day}
                  className="flex flex-col items-center"
                  data-testid={`indicator-workday-${day.toLowerCase()}-${contract.id}`}
                >
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                      isWorkDay
                        ? "bg-gray-100 text-gray-800"
                        : "bg-gray-300 text-gray-600"
                    }`}
                  >
                    {getDaysOfWeek([day])[0]}
                  </span>
                  {isWorkDay && (
                    <span className="text-xs text-gray-500 mt-1">7A-7P</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
