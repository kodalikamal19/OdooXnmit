from rest_framework import serializers
from apps.attendance.models import AttendanceRecord
from apps.employees.models import Employee

class AttendanceRecordSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.name')
    employee_login_id = serializers.ReadOnlyField(source='employee.login_id')
    job_position = serializers.ReadOnlyField(source='employee.job_position')
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceRecord
        fields = [
            'id', 'employee', 'employee_name', 'employee_login_id', 'job_position',
            'profile_picture', 'date', 'check_in', 'check_out', 'work_hours',
            'extra_hours', 'break_hours', 'status'
        ]

    def get_profile_picture(self, obj):
        request = self.context.get('request')
        if obj.employee.profile_picture and request:
            return request.build_absolute_uri(obj.employee.profile_picture.url)
        return None
