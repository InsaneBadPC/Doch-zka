import 'package:cloud_firestore/cloud_firestore.dart';

class TimeEntry {
  final String id;
  final String userId;
  final String userName;
  final String projectId;
  final String projectName;
  final String date; // YYYY-MM-DD
  final String startTime; // ISO-8601
  final String? endTime; // ISO-8601 or null
  final int breakMinutes;
  final double hoursWorked;
  final double hourlyRate;
  final bool isCustomRate;
  final double totalAmount;
  final String note;
  final String status; // 'draft' | 'pending' | 'approved' | 'rejected'
  final bool isRunning;
  final String adminComment;
  final String? approvedBy;
  final Timestamp? approvedAt;

  TimeEntry({
    required this.id,
    required this.userId,
    required this.userName,
    required this.projectId,
    required this.projectName,
    required this.date,
    required this.startTime,
    this.endTime,
    this.breakMinutes = 0,
    this.hoursWorked = 0.0,
    required this.hourlyRate,
    this.isCustomRate = false,
    this.totalAmount = 0.0,
    this.note = '',
    this.status = 'draft',
    this.isRunning = false,
    this.adminComment = '',
    this.approvedBy,
    this.approvedAt,
  });

  bool get isDraft => status == 'draft';
  bool get isPending => status == 'pending';
  bool get isApproved => status == 'approved';
  bool get isRejected => status == 'rejected';

  factory TimeEntry.fromMap(String id, Map<String, dynamic> data) {
    return TimeEntry(
      id: id,
      userId: data['userId'] as String? ?? '',
      userName: data['userName'] as String? ?? '',
      projectId: data['projectId'] as String? ?? '',
      projectName: data['projectName'] as String? ?? '',
      date: data['date'] as String? ?? '',
      startTime: data['startTime'] as String? ?? '',
      endTime: data['endTime'] as String?,
      breakMinutes: (data['breakMinutes'] as num?)?.toInt() ?? 0,
      hoursWorked: ((data['hoursWorked'] as num?)?.toDouble() ?? 0.0),
      hourlyRate: ((data['hourlyRate'] as num?)?.toDouble() ?? 0.0),
      isCustomRate: data['isCustomRate'] as bool? ?? false,
      totalAmount: ((data['totalAmount'] as num?)?.toDouble() ?? 0.0),
      note: data['note'] as String? ?? '',
      status: data['status'] as String? ?? 'draft',
      isRunning: data['isRunning'] as bool? ?? false,
      adminComment: data['adminComment'] as String? ?? '',
      approvedBy: data['approvedBy'] as String?,
      approvedAt: data['approvedAt'] is Timestamp
          ? data['approvedAt'] as Timestamp
          : (data['approvedAt'] is String && (data['approvedAt'] as String).isNotEmpty
              ? Timestamp.fromDate(DateTime.tryParse(data['approvedAt'] as String) ?? DateTime.now())
              : null),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'userName': userName,
      'projectId': projectId,
      'projectName': projectName,
      'date': date,
      'startTime': startTime,
      'endTime': endTime,
      'breakMinutes': breakMinutes,
      'hoursWorked': double.parse(hoursWorked.toStringAsFixed(2)),
      'hourlyRate': double.parse(hourlyRate.toStringAsFixed(2)),
      'isCustomRate': isCustomRate,
      'totalAmount': double.parse(totalAmount.toStringAsFixed(2)),
      'note': note,
      'status': status,
      'isRunning': isRunning,
      'adminComment': adminComment,
      'approvedBy': approvedBy,
      'approvedAt': approvedAt,
    };
  }

  TimeEntry copyWith({
    String? userId,
    String? userName,
    String? projectId,
    String? projectName,
    String? date,
    String? startTime,
    String? endTime,
    int? breakMinutes,
    double? hoursWorked,
    double? hourlyRate,
    bool? isCustomRate,
    double? totalAmount,
    String? note,
    String? status,
    bool? isRunning,
    String? adminComment,
    String? approvedBy,
    Timestamp? approvedAt,
  }) {
    return TimeEntry(
      id: id,
      userId: userId ?? this.userId,
      userName: userName ?? this.userName,
      projectId: projectId ?? this.projectId,
      projectName: projectName ?? this.projectName,
      date: date ?? this.date,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      breakMinutes: breakMinutes ?? this.breakMinutes,
      hoursWorked: hoursWorked ?? this.hoursWorked,
      hourlyRate: hourlyRate ?? this.hourlyRate,
      isCustomRate: isCustomRate ?? this.isCustomRate,
      totalAmount: totalAmount ?? this.totalAmount,
      note: note ?? this.note,
      status: status ?? this.status,
      isRunning: isRunning ?? this.isRunning,
      adminComment: adminComment ?? this.adminComment,
      approvedBy: approvedBy ?? this.approvedBy,
      approvedAt: approvedAt ?? this.approvedAt,
    );
  }
}
