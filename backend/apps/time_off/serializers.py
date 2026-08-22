from rest_framework import serializers
from apps.time_off.models import TimeOffAllocation, TimeOffRequest, PublicHoliday, TimeOffType

class TimeOffAllocationSerializer(serializers.ModelSerializer):
    remaining_days = serializers.ReadOnlyField()
    employee_name = serializers.ReadOnlyField(source='employee.name')

    class Meta:
        model = TimeOffAllocation
        fields = ['id', 'employee', 'employee_name', 'time_off_type', 'total_days', 'used_days', 'remaining_days']

class TimeOffRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.name')
    employee_login_id = serializers.ReadOnlyField(source='employee.login_id')
    time_off_type_display = serializers.CharField(source='get_time_off_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    attachment_url = serializers.SerializerMethodField()

    class Meta:
        model = TimeOffRequest
        fields = [
            'id', 'employee', 'employee_name', 'employee_login_id', 'time_off_type',
            'time_off_type_display', 'start_date', 'end_date', 'days_count', 'reason',
            'attachment', 'attachment_url', 'status', 'status_display', 'approved_by', 'created_at'
        ]
        read_only_fields = ['employee', 'days_count', 'status', 'approved_by', 'created_at']

    def get_attachment_url(self, obj):
        request = self.context.get('request')
        if obj.attachment and request:
            return request.build_absolute_uri(obj.attachment.url)
        return None

class PublicHolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = PublicHoliday
        fields = '__all__'
