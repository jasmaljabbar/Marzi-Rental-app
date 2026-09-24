import 'package:flutter/material.dart';
import '../features/catalog.dart';
import '../features/home.dart';
import '../features/rentals.dart';
import '../features/reports.dart';
import '../features/settings.dart';

class Shell extends StatefulWidget {
  const Shell({super.key});
  @override
  State<Shell> createState() => _ShellState();
}

class _ShellState extends State<Shell> {
  int tab = 0;

  static const destinations = <NavigationDestination>[
    NavigationDestination(
      icon: Icon(Icons.space_dashboard_outlined),
      selectedIcon: Icon(Icons.space_dashboard),
      label: 'Dashboard',
    ),
    NavigationDestination(
      icon: Icon(Icons.handshake_outlined),
      selectedIcon: Icon(Icons.handshake),
      label: 'Rentals',
    ),
    NavigationDestination(
      icon: Icon(Icons.warehouse_outlined),
      selectedIcon: Icon(Icons.warehouse),
      label: 'Inventory',
    ),
    NavigationDestination(
      icon: Icon(Icons.groups_outlined),
      selectedIcon: Icon(Icons.groups),
      label: 'Customers',
    ),
    NavigationDestination(
      icon: Icon(Icons.more_horiz),
      selectedIcon: Icon(Icons.more),
      label: 'More',
    ),
  ];

  static const names = [
    'Dashboard',
    'Rentals',
    'Inventory',
    'Customers',
    'More',
  ];

  void openRental({String equipment = ''}) {
    Navigator.push<void>(
      context,
      MaterialPageRoute<void>(
        builder: (_) => Scaffold(
          appBar: AppBar(title: const Text('New Rental')),
          body: HomeScreen(focusEquipment: equipment),
        ),
      ),
    );
  }

  List<Widget> get pages => [
    DashboardScreen(
      embedded: true,
      openTab: (index) => setState(() => tab = index),
    ),
    const RentalsScreen(showCreateAction: false),
    CatalogScreen(rent: (name) => openRental(equipment: name)),
    const CatalogScreen(customers: true),
    const MoreScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 720;
    final content = IndexedStack(index: tab, children: pages);
    return Scaffold(
      appBar: AppBar(
        title: Text(names[tab]),
        actions: [
          IconButton(
            tooltip: 'Rental alerts',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute<void>(
                builder: (_) => DashboardScreen(
                  scrollToAlerts: true,
                  openTab: (index) => setState(() => tab = index),
                ),
              ),
            ),
            icon: const Icon(Icons.notifications_outlined),
          ),
        ],
      ),
      body: wide
          ? Row(
              children: [
                NavigationRail(
                  selectedIndex: tab,
                  onDestinationSelected: (index) => setState(() => tab = index),
                  labelType: NavigationRailLabelType.all,
                  leading: Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: FloatingActionButton.small(
                      tooltip: 'New rental',
                      onPressed: openRental,
                      child: const Icon(Icons.add),
                    ),
                  ),
                  destinations: destinations
                      .map(
                        (item) => NavigationRailDestination(
                          icon: item.icon,
                          selectedIcon: item.selectedIcon,
                          label: Text(item.label),
                        ),
                      )
                      .toList(),
                ),
                const VerticalDivider(width: 1),
                Expanded(child: content),
              ],
            )
          : content,
      floatingActionButton: wide
          ? null
          : FloatingActionButton.extended(
              tooltip: 'New rental',
              onPressed: openRental,
              icon: const Icon(Icons.add),
              label: const Text('New Rental'),
            ),
      bottomNavigationBar: wide
          ? null
          : NavigationBar(
              selectedIndex: tab,
              onDestinationSelected: (index) => setState(() => tab = index),
              destinations: destinations,
            ),
    );
  }
}
