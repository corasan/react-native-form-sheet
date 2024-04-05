import { ModalSheet, useModalSheet } from "@corasan/modal-sheet";
import { Button, Dimensions, StyleSheet, Text, View } from "react-native";

const HEIGHT = Dimensions.get("window").height;

export default function App() {
  const { open, dismiss, extend } = useModalSheet();
  return (
    <View style={styles.container}>
      <Button
        title="Open Modal"
        onPress={() => {
          open();
        }}
      />
      <Button
        title="Open Half"
        onPress={() => {
          extend(HEIGHT / 2, true);
        }}
      />
      <Button
        title="Open Minimum"
        onPress={() => {
          extend(HEIGHT - 150, true);
        }}
      />
      <ModalSheet>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", justifyContent: "center" }}>
            <Text style={{ fontWeight: "500", fontSize: 18 }}>Modal Title</Text>
          </View>

          <View
            style={{
              paddingVertical: 40,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Button
              title="Close Modal"
              onPress={() => {
                dismiss();
              }}
            />
          </View>
        </View>
      </ModalSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
});