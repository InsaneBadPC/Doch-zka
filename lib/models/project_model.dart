class ProjectModel {
  final String id;
  final String name;
  final String client;
  final String status; // 'open' | 'closed'
  final double budgetLimitKcz;
  final String createdAt;

  ProjectModel({
    required this.id,
    required this.name,
    required this.client,
    required this.status,
    required this.budgetLimitKcz,
    required this.createdAt,
  });

  bool get isOpen => status == 'open';

  factory ProjectModel.fromMap(String id, Map<String, dynamic> data) {
    return ProjectModel(
      id: id,
      name: data['name'] as String? ?? 'Neznámá zakázka',
      client: data['client'] as String? ?? '',
      status: data['status'] as String? ?? 'open',
      budgetLimitKcz: (data['budgetLimitKcz'] as num?)?.toDouble() ?? 0.0,
      createdAt: data['createdAt'] as String? ?? DateTime.now().toIso8601String(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'client': client,
      'status': status,
      'budgetLimitKcz': budgetLimitKcz,
      'createdAt': createdAt,
    };
  }

  ProjectModel copyWith({
    String? name,
    String? client,
    String? status,
    double? budgetLimitKcz,
    String? createdAt,
  }) {
    return ProjectModel(
      id: id,
      name: name ?? this.name,
      client: client ?? this.client,
      status: status ?? this.status,
      budgetLimitKcz: budgetLimitKcz ?? this.budgetLimitKcz,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
