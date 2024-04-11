import { PortalProvider } from "@gorhom/portal";
import { PropsWithChildren, createContext, useContext } from "react";
import { Dimensions, Platform, StyleSheet, View } from "react-native";
import Animated, {
  SharedValue,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const HEIGHT = Dimensions.get("window").height;
const BORDER_RADIUS = Platform.select({ ios: 10, android: 0 }) ?? 0;

export const ModalSheetContext = createContext<{
  translateY: SharedValue<number>;
  backdropColor: SharedValue<string>;
  backdropOpacity: SharedValue<number>;
  open: () => void;
  dismiss: () => void;
  extend: (height?: number, disableSheetStack?: boolean) => void;
  minimize: (height?: number, disableSheetStack?: boolean) => void;
  setMinimumHeight: (height: number) => void;
  isAtMinimumHeight: SharedValue<boolean>;
}>({
  // @ts-ignore
  translateY: 0,
  modalRef: null,
  minimize: () => {},
});

export const useModalSheet = () => {
  const context = useContext(ModalSheetContext);
  if (context === undefined) {
    throw new Error("useModalSheet must be used within a ModalSheetProvider");
  }
  return {
    open: context.open,
    dismiss: context.dismiss,
    extend: context.extend,
    minimize: context.minimize,
  };
};

export const ModalSheetProvider = ({ children }: PropsWithChildren) => {
  const minimumHeight = useSharedValue(HEIGHT);
  const translateY = useSharedValue(HEIGHT);
  const dismissValue = useDerivedValue(() => HEIGHT - minimumHeight.value);
  const isAtMinimumHeight = useDerivedValue(
    () => translateY.value === dismissValue.value,
  );
  const disableSheetStackEffect = useSharedValue(false);
  const extendedHeight = useSharedValue(HEIGHT);
  const backdropColor = useSharedValue("black");
  const backdropOpacity = useSharedValue(0.3);
  const { top } = useSafeAreaInsets();
  const animatedStyles = useAnimatedStyle(() => {
    if (isAtMinimumHeight.value) {
      return {
        borderRadius: 0,
        transform: [{ scale: 1 }],
      };
    }
    if (disableSheetStackEffect.value) return {};
    const borderRadius = interpolate(
      translateY.value,
      [HEIGHT, 0],
      [BORDER_RADIUS, 24],
    );
    const scale = interpolate(translateY.value, [HEIGHT, 0], [1, 0.95]);
    const transformY = interpolate(
      translateY.value,
      [HEIGHT, 0],
      [-10, top - 10],
    );
    return {
      borderRadius,
      transform: [{ scale }, { translateY: transformY }],
    };
  });
  const backdropStyles = useAnimatedStyle(() => {
    if (disableSheetStackEffect.value) {
      return {
        opacity: interpolate(
          translateY.value,
          [dismissValue.value, extendedHeight.value],
          [0, backdropOpacity.value],
        ),
        zIndex: interpolate(
          translateY.value,
          [dismissValue.value, extendedHeight.value],
          [-99, 999],
        ),
        backgroundColor: backdropColor.value,
      };
    }
    return {
      opacity: interpolate(
        translateY.value,
        [dismissValue.value, 0],
        [0, backdropOpacity.value],
      ),
      zIndex: interpolate(
        translateY.value,
        [dismissValue.value, 0],
        [-99, 999],
      ),
      backgroundColor: backdropColor.value,
    };
  });

  const open = () => {
    "worklet";
    disableSheetStackEffect.value = false;
    translateY.value = withSpring(top + 20, { mass: 0.35 });
  };
  const dismiss = () => {
    "worklet";
    translateY.value = withTiming(dismissValue.value);
  };

  const extend = (height?: number, disableSheetStack?: boolean) => {
    "worklet";
    if (disableSheetStack !== undefined) {
      disableSheetStackEffect.value = disableSheetStack;
    }
    if (height) {
      translateY.value = withTiming(height);
      extendedHeight.value = height;
      return;
    }
    disableSheetStackEffect.value = false;
    translateY.value = withTiming(top + 20);
  };
  const minimize = (height?: number, disableSheetStack?: boolean) => {
    "worklet";
    if (disableSheetStack !== undefined) {
      disableSheetStackEffect.value = disableSheetStack;
    }
    if (height) {
      extendedHeight.value = height;
      translateY.value = withTiming(height);
      return;
    }
    translateY.value = withTiming(dismissValue.value);
  };
  const setMinimumHeight = (height: number) => {
    minimumHeight.value = height;
    translateY.value = HEIGHT - height;
  };

  return (
    <ModalSheetContext.Provider
      value={{
        translateY,
        open,
        dismiss,
        extend,
        minimize,
        backdropColor,
        backdropOpacity,
        setMinimumHeight,
        isAtMinimumHeight,
      }}
    >
      <PortalProvider rootHostName="modalSheet">
        <View style={styles.container}>
          <Animated.View style={[styles.animatedContainer, animatedStyles]}>
            <Animated.View style={[styles.backdrop, backdropStyles]} />
            {children}
          </Animated.View>
        </View>
      </PortalProvider>
    </ModalSheetContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "absolute",
    top: 0,
    bottom: -10,
    left: 0,
    right: 0,
    backgroundColor: "black",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  animatedContainer: {
    flex: 1,
    overflow: "hidden",
  },
});
