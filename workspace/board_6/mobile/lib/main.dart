import 'package:flutter/material.dart';
import 'screens/home_screen.dart';
import 'screens/book_appointment_screen.dart';
import 'screens/my_appointments_screen.dart';

void main() {
  runApp(const JollofApp());
}

class JollofApp extends StatelessWidget {
  const JollofApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Jollof Bookings',
      initialRoute: '/',
      routes: {
        '/': (_) => const HomeScreen(),
        '/book': (_) => const BookAppointmentScreen(),
        '/mine': (_) => const MyAppointmentsScreen(),
      },
    );
  }
}
