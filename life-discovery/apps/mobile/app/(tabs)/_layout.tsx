import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { palette } from "../../src/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: palette.panelStrong,
          borderTopColor: "rgba(255,255,255,0.08)",
          height: 88,
          paddingTop: 10,
          paddingBottom: 16
        },
        tabBarLabelStyle: {
          fontSize: 10,
          letterSpacing: 0.4
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Hoje",
          tabBarIcon: ({ color, size }) => <Ionicons name="sparkles-outline" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="watch"
        options={{
          title: "Ver",
          tabBarIcon: ({ color, size }) => <Ionicons name="film-outline" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="concierge"
        options={{
          title: "Guia",
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses-outline" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Mapa",
          tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: "Plano",
          tabBarIcon: ({ color, size }) => <Ionicons name="heart-circle-outline" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Conta",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" color={color} size={size} />
        }}
      />
    </Tabs>
  );
}
