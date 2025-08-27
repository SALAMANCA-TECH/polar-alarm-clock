import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Circle } from 'react-native-svg';

const PolarClock = ({ timerData, stopwatchData, settings, colors }) => {
  const [time, setTime] = useState(new Date());
  const animatedValues = useRef(
    [...Array(6)].map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const newRings = getRings();
    newRings.forEach((ring, i) => {
      Animated.timing(animatedValues[i], {
        toValue: (ring.value / ring.max) * 360,
        duration: 500,
        useNativeDriver: false,
      }).start();
    });
  }, [time, stopwatchData, timerData, settings]);

  const getRings = () => {
    if (stopwatchData) {
      const stopwatchSeconds = (stopwatchData / 1000);
      const stopwatchMinutes = stopwatchSeconds / 60;
      const stopwatchHours = stopwatchMinutes / 60;
      return [
        { value: stopwatchSeconds, max: 60, color: colors.seconds },
        { value: stopwatchMinutes, max: 60, color: colors.minutes },
        { value: stopwatchHours, max: 12, color: colors.hours },
      ];
    } else {
      const seconds = time.getSeconds() + time.getMilliseconds() / 1000;
      const minutes = time.getMinutes() + seconds / 60;
      const hours = (time.getHours() % 12) + minutes / 60;
      const day = time.getDay() + hours / 24;
      const month = time.getMonth() + day / new Date(time.getFullYear(), time.getMonth() + 1, 0).getDate();
      const rings = [
        { value: seconds, max: 60, color: colors.seconds },
        { value: minutes, max: 60, color: colors.minutes },
        { value: hours, max: 12, color: colors.hours },
        { value: day, max: 7, color: colors.day },
        { value: month, max: 12, color: colors.month },
      ];
      if (timerData && timerData.initialTime > 0) {
        rings.unshift({ value: timerData.time, max: timerData.initialTime, color: colors.timer });
      }
      return rings;
    }
  };

  const size = 300;
  const strokeWidth = 20;
  const center = size / 2;

  const describeArc = (x, y, radius, startAngle, endAngle) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);

    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

    const d = [
      'M', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(' ');

    return d;
  }

  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;

    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  }

  let rings;
  if (stopwatchData) {
    const stopwatchSeconds = (stopwatchData / 1000);
    const stopwatchMinutes = stopwatchSeconds / 60;
    const stopwatchHours = stopwatchMinutes / 60;
    rings = [
      { value: stopwatchSeconds, max: 60, color: colors.seconds }, // Stopwatch Seconds
      { value: stopwatchMinutes, max: 60, color: colors.minutes }, // Stopwatch Minutes
      { value: stopwatchHours, max: 12, color: colors.hours }, // Stopwatch Hours
    ];
  } else {
    const seconds = time.getSeconds() + time.getMilliseconds() / 1000;
    const minutes = time.getMinutes() + seconds / 60;
    const hours = (time.getHours() % 12) + minutes / 60;
    const day = time.getDay() + hours / 24;
    const month = time.getMonth() + day / new Date(time.getFullYear(), time.getMonth() + 1, 0).getDate();
    rings = [
      { value: seconds, max: 60, color: colors.seconds }, // Seconds
      { value: minutes, max: 60, color: colors.minutes }, // Minutes
      { value: hours, max: 12, color: colors.hours }, // Hours
      { value: day, max: 7, color: colors.day }, // Day
      { value: month, max: 12, color: colors.month }, // Month
    ];
  }

  if (timerData && timerData.initialTime > 0) {
    rings.unshift({ value: timerData.time, max: timerData.initialTime, color: colors.timer }); // Timer
  }

  const AnimatedPath = Animated.createAnimatedComponent(Path);

  return (
    <View style={styles.container}>
      <Svg height={size} width={size} viewBox={`0 0 ${size} ${size}`}>
        {rings.map((ring, i) => {
          const radius = (size / 2) - (strokeWidth * (i + 1));
          const d = animatedValues[i].interpolate({
            inputRange: [0, 360],
            outputRange: [
              describeArc(center, center, radius, 0, 0.01),
              describeArc(center, center, radius, 0, 360),
            ],
          });

          return (
            <React.Fragment key={i}>
              <AnimatedPath
                d={d}
                stroke={ring.color}
                strokeWidth={strokeWidth}
                fill="none"
              />
              {settings.showSeparators && i < rings.length - 1 && (
                <Circle
                  cx={center}
                  cy={center}
                  r={radius - strokeWidth / 2}
                  stroke="#333"
                  strokeWidth={1}
                  fill="none"
                />
              )}
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PolarClock;
