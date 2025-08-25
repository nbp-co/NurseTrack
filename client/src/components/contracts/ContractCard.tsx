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
            

            <div className="grid grid-cols-2 gap-6 text-sm">
              <div className="space-y-3">
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
              <div className="space-y-3">
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
                    <DollarSign className="w-4 h-4 mr-1" />
                    OT Rate
                  </p>
                  <p className="font-medium text-gray-900" data-testid={`text-contract-ot-rate-${contract.id}`}>
                    {contract.overtimeRate ? `${formatCurrency(contract.overtimeRate)}/hour` : 'N/A'}
                  </p>
                </div>
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
        <div className="mt-4 pt-3 border-t border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <p className="text-sm font-semibold text-gray-800">Schedule</p>
            </div>
            <div className="bg-white px-2 py-1 rounded-full border border-blue-200">
              <p className="text-xs font-medium text-blue-700">
                <span data-testid={`text-contract-shifts-${contract.id}`}>{shiftsCount}</span> shifts
              </p>
            </div>
          </div>

          <div className="flex space-x-1.5 justify-between">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => {
              const isWorkDay = contract.recurrence.byDay.includes(day as any);
              return (
                <div
                  key={day}
                  className="flex flex-col items-center flex-1"
                  data-testid={`indicator-workday-${day.toLowerCase()}-${contract.id}`}
                >
                  <div className="relative">
                    <span
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-all ${
                        isWorkDay
                          ? "bg-blue-500 text-white shadow-md"
                          : "bg-white text-gray-400 border border-gray-200"
                      }`}
                    >
                      {getDaysOfWeek([day])[0].charAt(0)}
                    </span>
                    {isWorkDay && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  {isWorkDay && (
                    <div className="mt-2 text-center">
                      <span className="text-xs font-medium text-gray-700 bg-white px-1.5 py-0.5 rounded-full border border-blue-200">
                        7A-7P
                      </span>
                    </div>
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
