class ProjectPhoto {
  final String id;
  final String projectId;
  final String userId;
  final String userName;
  final String photoData; // base64 data URI nebo URL
  final String caption;
  final String createdAt;

  const ProjectPhoto({
    required this.id,
    required this.projectId,
    required this.userId,
    required this.userName,
    required this.photoData,
    required this.caption,
    required this.createdAt,
  });

  factory ProjectPhoto.fromMap(String id, Map<String, dynamic> data) {
    return ProjectPhoto(
      id: id,
      projectId: data['projectId'] as String? ?? '',
      userId: data['userId'] as String? ?? '',
      userName: data['userName'] as String? ?? '',
      photoData: data['photoData'] as String? ?? '',
      caption: data['caption'] as String? ?? '',
      createdAt: data['createdAt'] as String? ?? DateTime.now().toIso8601String(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'projectId': projectId,
      'userId': userId,
      'userName': userName,
      'photoData': photoData,
      'caption': caption,
      'createdAt': createdAt,
    };
  }
}
