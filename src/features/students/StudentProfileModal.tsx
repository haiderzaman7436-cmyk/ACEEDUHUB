import { Student } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, User, Users, Phone, MapPin, Activity, AlertCircle } from 'lucide-react';

interface StudentProfileModalProps {
  student: Student;
  onClose: () => void;
}

export function StudentProfileModal({ student, onClose }: StudentProfileModalProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'graduated':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'suspended':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'left':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      
      <Card className="relative w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in shadow-2xl border-0">
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-r from-indigo-500 to-purple-600 z-0"></div>
        
        <div className="relative z-10 flex justify-between items-start p-6">
          <div className="flex gap-5 items-end">
            <div className="h-24 w-24 rounded-2xl bg-white p-1.5 shadow-md flex items-center justify-center border border-indigo-50">
              <div className="h-full w-full rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 text-3xl font-bold">
                {student.firstName[0]}{student.lastName[0]}
              </div>
            </div>
            <div className="pb-2 text-white">
              <h2 className="text-2xl font-bold">{student.firstName} {student.lastName}</h2>
              <p className="text-indigo-100 text-sm font-medium opacity-90 mt-0.5">
                {student.className} • Section {student.section}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="h-8 w-8 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <CardContent className="relative z-10 p-6 flex-1 overflow-y-auto space-y-6 bg-slate-50/50">
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
              <span className="text-xs text-slate-500 font-medium mb-1">Status</span>
              <Badge variant="outline" className={`${getStatusColor(student.status)} font-semibold uppercase tracking-wider text-[10px]`}>
                {student.status}
              </Badge>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
              <span className="text-xs text-slate-500 font-medium mb-1">Admission ID</span>
              <span className="font-bold text-slate-800">{student.admissionNumber}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
              <span className="text-xs text-slate-500 font-medium mb-1">Roll No</span>
              <span className="font-bold text-slate-800">{student.rollNumber || 'N/A'}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
              <span className="text-xs text-slate-500 font-medium mb-1">Admitted On</span>
              <span className="font-bold text-slate-800 text-sm">{new Date(student.admissionDate).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Personal Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-500" />
                Personal Details
              </h3>
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm divide-y divide-slate-50">
                <div className="p-3.5 flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Date of Birth</span>
                  <span className="font-semibold text-slate-800">{new Date(student.dateOfBirth).toLocaleDateString()}</span>
                </div>
                <div className="p-3.5 flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Gender</span>
                  <span className="font-semibold text-slate-800 capitalize">{student.gender}</span>
                </div>
                <div className="p-3.5 flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Blood Group</span>
                  <span className="font-semibold text-red-600">{student.bloodGroup || 'Not specified'}</span>
                </div>
                <div className="p-3.5 flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Religion</span>
                  <span className="font-semibold text-slate-800">{student.religion || 'Not specified'}</span>
                </div>
              </div>
            </div>

            {/* Address Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-500" />
                Location
              </h3>
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-sm h-[calc(100%-2rem)]">
                <p className="text-slate-700 leading-relaxed font-medium">
                  {student.address}
                </p>
                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-400 mb-0.5">City</div>
                    <div className="font-semibold text-slate-800">{student.city}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-0.5">State/Province</div>
                    <div className="font-semibold text-slate-800">{student.state}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Guardians */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              Guardians
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {student.guardians.map((guardian, i) => (
                <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-800 text-sm truncate">{guardian.name}</div>
                    <div className="text-xs text-indigo-600 font-semibold mb-2">{guardian.relation}</div>
                    
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        {guardian.phone}
                      </div>
                      {guardian.email && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Activity className="h-3.5 w-3.5 text-slate-400" />
                          {guardian.email}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Medical Notes */}
          {student.medicalNotes && (
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <h3 className="text-xs font-bold text-amber-800 flex items-center gap-1.5 mb-2">
                <AlertCircle className="h-4 w-4" />
                Medical Notes & Allergies
              </h3>
              <p className="text-sm text-amber-900 font-medium leading-relaxed">
                {student.medicalNotes}
              </p>
            </div>
          )}
          
        </CardContent>
        <div className="p-4 bg-white border-t border-slate-100 flex justify-end">
          <Button variant="outline" onClick={onClose} className="rounded-xl px-6">
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}
