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

            {/* Contract Metrics */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="grid grid-cols-5 gap-4 text-xs">
                <div className="text-center">
                  <p className="text-gray-500 font-medium">1/06/25 -</p>
                  <p className="text-gray-500 font-medium">3/05/25</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 font-medium"># SHIFTS</p>
                  <p className="font-semibold text-gray-900">33</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 font-medium">BASE</p>
                  <p className="font-semibold text-gray-900">$40.00</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 font-medium">HRS/WK</p>
                  <p className="font-semibold text-gray-900">32</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 font-medium">OT</p>
                  <p className="font-semibold text-gray-900">$20.00</p>
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
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-sm font-medium text-gray-700 mb-2">Schedule</p>
          <div className="grid grid-cols-4 gap-3 text-xs text-center">
            <div>
              <p className="font-medium text-gray-700">SUN</p>
              <p className="text-gray-600">6a-2p</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">TUES</p>
              <p className="text-gray-600">6a-2p</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">THURS</p>
              <p className="text-gray-600">6a-2p</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">SAT</p>
              <p className="text-gray-600">6a-2p</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
