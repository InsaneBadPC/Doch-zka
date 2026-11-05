class AppUser {
  final String id;
  final String name;
  final String email;
  final String role; // 'worker' | 'admin'
  final double defaultHourlyRate;
  final bool allowCustomRate;
  final bool active;
  final String? password;

  AppUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.defaultHourlyRate = 250.0,
    this.allowCustomRate = false,
    this.active = true,
    this.password,
  });

  bool get isAdmin => role == 'admin';
  bool get isWorker => role == 'worker';

  factory AppUser.fromMap(String id, Map<String, dynamic> data) {
    return AppUser(
      id: id,
      name: data['name'] as String? ?? 'Neznámý pracovník',
      email: data['email'] as String? ?? '',
      role: data['role'] as String? ?? 'worker',
      defaultHourlyRate: (data['defaultHourlyRate'] as num?)?.toDouble() ?? 250.0,
      allowCustomRate: data['allowCustomRate'] as bool? ?? false,
      active: data['active'] as bool? ?? true,
      password: data['password'] as String?,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'role': role,
      'defaultHourlyRate': defaultHourlyRate,
      'allowCustomRate': allowCustomRate,
      'active': active,
      if (password != null && password!.isNotEmpty) 'password': password,
    };
  }

  AppUser copyWith({
    String? name,
    String? email,
    String? role,
    double? defaultHourlyRate,
    bool? allowCustomRate,
    bool? active,
    String? password,
  }) {
    return AppUser(
      id: id,
      name: name ?? this.name,
      email: email ?? this.email,
      role: role ?? this.role,
      defaultHourlyRate: defaultHourlyRate ?? this.defaultHourlyRate,
      allowCustomRate: allowCustomRate ?? this.allowCustomRate,
      active: active ?? this.active,
      password: password ?? this.password,
    );
  }
}
