class ApiClient {
  final String baseUrl;
  ApiClient({this.baseUrl = 'http://localhost:8000'});

  Future<List<String>> fetchAppointments() async {
    return [];
  }
}
