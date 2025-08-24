import { Edit2, ChevronRight, DollarSign, Clock, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Contract } from "@/types";

interface ContractCardProps {
  contract: Contract;
  onEdit: () => void;
  onViewDetails?: () => void;
  shiftsCount?: number;
}

export function ContractCard({ contract, onEdit, onViewDetails, shiftsCount = 0 }: ContractCardProps) {
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
      day: 'numeric', 
      year: 'numeric'
    })} - ${end.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
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

  const getCardBorderColor = (status: string) => {
    switch (status) {
      case 'active': return 'border-l-green-500';
      case 'completed': return 'border-l-blue-500';
      case 'planned': return 'border-l-yellow-500';
      case 'archive': return 'border-l-gray-400';
      default: return 'border-l-gray-400';
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
    <Card className={`overflow-hidden hover:shadow-md transition-shadow border-l-4 ${getCardBorderColor(contract.status)}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-base font-semibold text-gray-900" data-testid={`text-contract-facility-${contract.id}`}>
                {contract.facility}
              </h3>
              <Badge 
                variant={getStatusColor(contract.status)}
                data-testid={`badge-contract-status-${contract.id}`}
              >
                {getStatusLabel(contract.status)}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-gray-500 flex items-center">
                  <DollarSign className="w-4 h-4 mr-1" />
                  OT Rate
                </p>
                <p className="font-medium text-gray-900" data-testid={`text-contract-ot-rate-${contract.id}`}>
                  {contract.overtimeRate ? `${formatCurrency(contract.overtimeRate)}/hour` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 flex items-center">
                  <DollarSign className="w-4 h-4 mr-1" />
                  Base Rate
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
                  HRS/WK
                </p>
                <p className="font-medium text-gray-900" data-testid={`text-contract-hours-${contract.id}`}>
                  {contract.weeklyHours} hours
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 ml-3">
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
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-gray-700">Schedule</p>
            <p className="text-xs text-gray-500">
              <span data-testid={`text-contract-shifts-${contract.id}`}>{shiftsCount}</span> shifts
            </p>
          </div>
          <div className="flex space-x-1">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => {
              const isWorkDay = contract.recurrence.byDay.includes(day as any);
              return (
                <div
                  key={day}
                  className="flex flex-col items-center"
                  data-testid={`indicator-workday-${day.toLowerCase()}-${contract.id}`}
                >
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
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
