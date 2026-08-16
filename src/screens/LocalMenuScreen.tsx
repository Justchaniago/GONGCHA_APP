import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { buildMenuViewModel } from '../application/menu/GetMenu';
import MenuView from '../presentation/menu/MenuView';
import type { MenuItemDisplay } from '../application/menu/GetMenu';
import type { MenuItem } from '../application/menu/MenuItem';

const MOCK_ITEMS: MenuItem[] = [
  {
    id: 'mock-1',
    name: 'Pearl Milk Tea',
    category: 'MilkTea',
    basePrice: 25000,
    isLargeAvailable: true,
    isHotAvailable: true,
    description: 'Our signature milk tea with delicious chewy tapioca pearls.',
    isAvailable: true,
    rating: 4.9,
    isPopular: true,
    isNew: false,
    tags: ['ICE', 'HOT'],
  } as any,
  {
    id: 'mock-2',
    name: 'Taro Milk Tea',
    category: 'MilkTea',
    basePrice: 26000,
    isLargeAvailable: true,
    isHotAvailable: false,
    description: 'Creamy taro milk tea with a sweet, nutty taste.',
    isAvailable: true,
    rating: 4.8,
    isPopular: true,
    isNew: false,
    tags: ['ICE'],
  } as any,
  {
    id: 'mock-3',
    name: 'Brown Sugar Fresh Milk',
    category: 'MilkTea',
    basePrice: 28000,
    isLargeAvailable: true,
    isHotAvailable: false,
    description: 'Fresh milk with delicious brown sugar syrup stripes and boba.',
    isAvailable: true,
    rating: 4.9,
    isPopular: true,
    isNew: true,
    tags: ['ICE'],
  } as any,
  {
    id: 'mock-4',
    name: 'Earl Grey Milk Tea',
    category: 'MilkTea',
    basePrice: 25000,
    isLargeAvailable: true,
    isHotAvailable: true,
    description: 'Fragrant Earl Grey tea blended with rich, creamy milk.',
    isAvailable: true,
    rating: 4.5,
    isPopular: false,
    isNew: false,
    tags: ['ICE', 'HOT'],
  } as any,
  {
    id: 'mock-5',
    name: 'Passion Fruit Green Tea',
    category: 'CreativeTea',
    basePrice: 24000,
    isLargeAvailable: true,
    isHotAvailable: false,
    description: 'Refreshing jasmine green tea infused with sweet and tangy passion fruit juice.',
    isAvailable: true,
    rating: 4.7,
    isPopular: true,
    isNew: false,
    tags: ['ICE'],
  } as any,
  {
    id: 'mock-6',
    name: 'Mango Green Tea',
    category: 'CreativeTea',
    basePrice: 24000,
    isLargeAvailable: true,
    isHotAvailable: false,
    description: 'Tropical sweet mango paired with refreshing green tea.',
    isAvailable: true,
    rating: 4.6,
    isPopular: false,
    isNew: true,
    tags: ['ICE'],
  } as any,
  {
    id: 'mock-7',
    name: 'Milk Foam Black Tea',
    category: 'CreativeTea',
    basePrice: 27000,
    isLargeAvailable: true,
    isHotAvailable: true,
    description: 'Our signature salty-sweet cream layer on top of fresh brewed black tea.',
    isAvailable: true,
    rating: 4.8,
    isPopular: true,
    isNew: false,
    tags: ['ICE', 'HOT'],
  } as any,
];

export default function LocalMenuScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();

  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<MenuItemDisplay | null>(null);

  const model = buildMenuViewModel(MOCK_ITEMS, selectedCategory);

  const filteredItems = searchQuery
    ? model.items.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : model.items;

  return (
    <MenuView
      categories={model.categories}
      items={filteredItems}
      selectedCategory={selectedCategory}
      onSelectCategory={setSelectedCategory}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      selectedItem={selectedItem}
      onSelectItem={setSelectedItem}
      loading={false}
      onBack={() => navigation.goBack()}
    />
  );
}
