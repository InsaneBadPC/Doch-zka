class SalaryAdvance {
  final String id;
  final String userId;
  final String userName;
  final String monthKey; // YYYY-MM
  final String date; // YYYY-MM-DD
  final double amount;
  final String note;
  final String createdAt;

  const SalaryAdvance({
    required this.id,
    required this.userId,
    required this.userName,
    required this.monthKey,
    required this.date,
    required this.amount,
    required this.note,
    required this.createdAt,
  });

  factory SalaryAdvance.fromMap(String id, Map<String, dynamic> data) {
    return SalaryAdvance(
      id: id,
      userId: data['userId'] as String? ?? '',
      userName: data['userName'] as String? ?? '',
      monthKey: data['monthKey'] as String? ?? '',
      date: data['date'] as String? ?? '',
      amount: (data['amount'] as num?)?.toDouble() ?? 0.0,
      note: data['note'] as String? ?? '',
      createdAt: data['createdAt'] as String? ?? DateTime.now().toIso8601String(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'userName': userName,
      'monthKey': monthKey,
      'date': date,
      'amount': amount,
      'note': note,
      'createdAt': createdAt,
    };
  }
}
