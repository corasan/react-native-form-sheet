import { Portal } from '@gorhom/portal'
import {
  PropsWithChildren,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
} from 'react'
import { Dimensions, View, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import {
  GestureDetector,
  Gesture,
  GestureStateChangeEvent,
  PanGestureHandlerEventPayload,
  GestureUpdateEvent,
  GestureTouchEvent,
} from 'react-native-gesture-handler'
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ModalSheetContext } from './Context'
import { animateClose, animateOpen, interpolateClamp } from './utils'

const HEIGHT = Dimensions.get('window').height

type GestureEvent = GestureStateChangeEvent<PanGestureHandlerEventPayload>

export interface ModalSheetProps {
  name: string
  containerStyle?: StyleProp<Animated.AnimateStyle<StyleProp<ViewStyle>>>
  noHandle?: boolean
  backdropColor?: string
  backdropOpacity?: number
  minimizedHeight?: number
  disableSheetStackEffect?: boolean
  onGestureUpdate?: (e: GestureUpdateEvent<PanGestureHandlerEventPayload>) => void
  onGestureBegin?: (e: GestureEvent) => void
  onGestureStarts?: (e: GestureEvent) => void
  onGestureEnd?: (e: GestureEvent) => void
  onGestureFinalize?: (e: GestureEvent) => void
  onGestureTouchesDown?: (e: GestureTouchEvent) => void
  onGestureTouchesUp?: (e: GestureTouchEvent) => void
  onGestureTouchesMove?: (e: GestureTouchEvent) => void
  onGestureTouchesCancelled?: (e: GestureTouchEvent) => void
}

export const useInternalModalSheet = () => {
  const context = useContext(ModalSheetContext)
  if (context === undefined) {
    throw new Error('useInternalModalSheet must be used within a ModalSheetProvider')
  }
  return context
}

export const ModalSheet = forwardRef(
  (
    {
      name,
      noHandle = false,
      backdropColor,
      backdropOpacity,
      minimizedHeight,
      children,
      ...props
    }: PropsWithChildren<ModalSheetProps>,
    ref: any,
  ) => {
    const {
      registerModal,
      addModalToStack,
      removeModalFromStack,
      activeIndex,
      modalStack,
      updateY,
      disableSheetStackEffect,
      minimumHeight,
      backdropColor: bckdropColor,
      backdropOpacity: bckdropOpacity,
      isAtMinimumHeight: sharedIsMinimumHeight,
    } = useContext(ModalSheetContext)
    const translateY = useSharedValue(HEIGHT)
    const dismissValue = useDerivedValue(
      () => HEIGHT - (!minimizedHeight ? 0 : minimizedHeight),
    )
    const isAtMinimumHeight = useDerivedValue(
      () => translateY.value === dismissValue.value,
    )
    sharedIsMinimumHeight.value = isAtMinimumHeight.value
    const scaleX = useSharedValue(1)
    const borderRadius = useSharedValue(40)
    const { top } = useSafeAreaInsets()
    const gesture = Gesture.Pan()
      .onBegin((e) => props.onGestureBegin?.(e))
      .onStart((e) => props.onGestureStarts?.(e))
      .onFinalize((e) => props.onGestureFinalize?.(e))
      .onTouchesDown((e) => {
        if (props.onGestureTouchesDown) {
          runOnJS(props.onGestureTouchesDown)(e)
        }
      })
      .onTouchesUp((e) => props.onGestureTouchesUp?.(e))
      .onTouchesMove((e) => props.onGestureTouchesMove?.(e))
      .onTouchesCancelled((e) => props.onGestureTouchesCancelled?.(e))
      .onUpdate((e) => {
        if (props.onGestureUpdate) {
          props.onGestureUpdate(e)
          return
        }
        if (e.absoluteY < top) {
          return
        }
        translateY.value = e.absoluteY
        if (!disableSheetStackEffect.value) {
          updateY(e.absoluteY)
        }
        const behindModalRef = modalStack[activeIndex.value - 1]
        if (behindModalRef) {
          const val = interpolateClamp(
            e.absoluteY,
            [HEIGHT, top + 20],
            [top + 20, top - 5],
          )
          behindModalRef.translateY.value = val
          behindModalRef.scaleX.value = interpolate(
            e.absoluteY,
            [dismissValue.value, top + 20],
            [1, 0.96],
            Extrapolation.CLAMP,
          )
        }
      })
      .onEnd((e) => {
        if (props.onGestureEnd) {
          runOnJS(props.onGestureEnd)(e)
          return
        }
        if (e.translationY < 0) {
          translateY.value = animateOpen(top + 10)
          if (activeIndex.value === 0) {
            updateY(animateOpen(top + 10))
          }
          runOnJS(addModalToStack)(name)
        } else {
          translateY.value = animateClose(HEIGHT - (minimizedHeight ?? 0))
          updateY(animateClose(HEIGHT - (minimizedHeight ?? 0)))
          runOnJS(removeModalFromStack)(name)
        }
      })

    const modalStyle = useAnimatedStyle(() => {
      return {
        borderRadius: borderRadius.value,
        transform: [
          {
            translateY: translateY.value,
          },
          {
            scaleX: scaleX.value,
          },
        ],
      }
    })
    const shadowStyle = useAnimatedStyle(() => {
      return {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: interpolateClamp(
          translateY.value,
          [0, minimumHeight.value],
          [0, 0.08],
        ),
        shadowRadius: 8,
        backdropColor: 'white',
      }
    })
    const backdropStyles = useAnimatedStyle(() => {
      return {
        opacity: interpolateClamp(scaleX.value, [1, 0.95], [0, 0.4]),
        zIndex: interpolateClamp(scaleX.value, [1, 0.95], [0, 99]),
      }
    })

    const open = () => {
      translateY.value = animateOpen(top + 10)
      if (activeIndex.value === 0) {
        updateY(animateOpen(top + 10))
      }
      addModalToStack(name)
      // // Animate the modal behind
      const behindModalRef = modalStack[activeIndex.value]
      if (behindModalRef) {
        behindModalRef.translateY.value = animateClose(top - 5)
        behindModalRef.scaleX.value = animateClose(0.96)
        behindModalRef.borderRadius.value = animateClose(24)
      }
    }

    const dismiss = () => {
      translateY.value = animateClose(HEIGHT - (minimizedHeight ?? 0))
      if (activeIndex.value === 1) {
        updateY(animateClose(HEIGHT - (minimizedHeight ?? 0)))
      }
      // Animate the modal behind
      const behindModalRef = modalStack[activeIndex.value - 1]
      if (behindModalRef) {
        behindModalRef.translateY.value = animateClose(top + 20)
        behindModalRef.scaleX.value = animateClose(1)
        behindModalRef.borderRadius.value = animateClose(40)
      }
      removeModalFromStack(name)
    }

    const expand = useCallback((height?: number, disableSheetEffect?: boolean) => {
      'worklet'
      if (disableSheetEffect !== undefined) {
        disableSheetStackEffect.value = disableSheetEffect ? 1 : 0
      }
      if (height) {
        translateY.value = animateOpen(height)
        minimumHeight.value = height
        return
      }
      disableSheetStackEffect.value
      open()
    }, [])

    const minimize = useCallback((height?: number) => {
      'worklet'
      if (disableSheetStackEffect.value) {
        disableSheetStackEffect.value = 0
      }
      if (height) {
        translateY.value = animateClose(height)
        minimumHeight.value = height
        return
      }
      dismiss()
    }, [])

    const setDisableSheetStackEffect = useCallback((value: 1 | 0) => {
      disableSheetStackEffect.value = value
    }, [])

    useImperativeHandle(ref, () => ({
      open,
      dismiss,
      translateY,
      scaleX,
      borderRadius,
      minimizedHeight,
      id: name,
      expand,
      minimize,
      setDisableSheetStackEffect,
    }))

    useEffect(() => {
      registerModal(name, ref.current)
    }, [name, ref])

    useEffect(() => {
      disableSheetStackEffect.value = props.disableSheetStackEffect ? 1 : 0
      if (backdropColor && backdropColor !== 'black') {
        bckdropColor.value = backdropColor
      }
      if (backdropOpacity && backdropOpacity !== 0.4) {
        bckdropOpacity.value = backdropOpacity
      }
      if (minimizedHeight) {
        minimumHeight.value = minimizedHeight
        translateY.value = animateClose(HEIGHT - minimizedHeight)
      }
    }, [backdropOpacity, backdropOpacity, minimizedHeight, props.disableSheetStackEffect])

    return (
      <Portal hostName="modalSheet">
        <Animated.View style={shadowStyle}>
          <Animated.View
            style={[
              styles.container,
              props.containerStyle,
              styles.permanentContainer,
              modalStyle,
            ]}
          >
            <Animated.View style={[styles.backdrop, backdropStyles]} />
            <GestureDetector gesture={gesture}>
              <View style={styles.handleContainer}>
                {!noHandle && <View style={styles.handle} />}
              </View>
            </GestureDetector>
            <View style={{ flex: 1 }}>{children}</View>
          </Animated.View>
        </Animated.View>
      </Portal>
    )
  },
)

const styles = StyleSheet.create({
  permanentContainer: {
    height: HEIGHT,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    overflow: 'hidden',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 40,
  },
  handleContainer: {
    height: 30,
    width: '100%',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    height: 5,
    width: '10%',
    borderRadius: 100,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    backgroundColor: 'black',
  },
})
