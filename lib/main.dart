import 'package:flutter/material.dart';

void main() {
  runApp(const SKRCApp());
}

class SKRCApp extends StatelessWidget {
  const SKRCApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SKRC wav to ogg',
      theme: ThemeData.dark(),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('SKRC wav → ogg'),
      ),
      body: const Center(
        child: Text(
          '223系 新快速\nSKRC wav → ogg アプリ\n\n準備完了！',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 18),
        ),
      ),
    );
  }
}
