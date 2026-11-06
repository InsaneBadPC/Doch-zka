class AbsenceModel {
  final String id;
  final String userId;
  final String userName;
  final String type; // 'vacation' | 'doctor' | 'sick' | 'personal'
  final String startDate; // YYYY-MM-DD
  final String endDate; // YYYY-MM-DD
  final bool isFullDay;
  final String? startTime; // HH:mm
  final String? endTime; // HH:mm
  final String note;
  final String status; // 'pending' | 'approved' | 'rejected'
  final String createdAt;
  final String? approvedBy;

  const AbsenceModel({
    required this.id,
    required this.userId,
    required this.userName,
    required this.type,
    required this.startDate,
    required this.endDate,
    required this.isFullDay,
    this.startTime,
    this.endTime,
    required this.note,
    required this.status,
    required this.createdAt,
    this.approvedBy,
  });

  bool get isPending => status == 'pending';
  bool get isApproved => status == 'approved';
  bool get isRejected => status == 'rejected';

  String get typeLabelCz {
    switch (type) {
      case 'vacation':
        return 'Dovolená';
      case 'doctor':
        return 'Lékař / Propustka';
      case 'sick':
        return 'Nemocenská (PN)';
      case 'personal':
        return 'Osobní volno';
      default:
        return 'Nepřítomnost';
    }
  }

  factory AbsenceModel.fromMap(String id, Map<String, dynamic> data) {
    return AbsenceModel(
      id: id,
      userId: data['userId'] as String? ?? '',
      userName: data['userName'] as String? ?? '',
      type: data['type'] as String? ?? 'vacation',
      startDate: data['startDate'] as String? ?? '',
      endDate: data['endDate'] as String? ?? '',
      isFullDay: data['isFullDay'] as bool? ?? true,
      startTime: data['startTime'] as String?,
      endTime: data['endTime'] as String?,
      note: data['note'] as String? ?? '',
      status: data['status'] as String? ?? 'pending',
      createdAt: data['createdAt'] as String? ?? DateTime.now().toIso8601String(),
      approvedBy: data['approvedBy'] as String?,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'userName': userName,
      'type': type,
      'startDate': startDate,
      'endDate': endDate,
      'isFullDay': isFullDay,
      if (startTime != null) 'startTime': startTime,
      if (endTime != null) 'endTime': endTime,
      'note': note,
      'status': status,
      'createdAt': createdAt,
      'approvedBy': approvedBy,
    };
  }

  AbsenceModel copyWith({
    String? id,
    String? userId,
    String? userName,
    String? type,
    String? startDate,
    String? endDate,
    bool? isFullDay,
    String? startTime,
    String? endTime,
    String? note,
    String? status,
    String? createdAt,
    String? approvedBy,
  }) {
    return AbsenceModel(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      userName: userName ?? this.userName,
      type: type ?? this.type,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      isFullDay: isFullDay ?? this.isFullDay,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      note: note ?? this.note,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      approvedBy: approvedBy ?? this.approvedBy,
    );
  }
}
