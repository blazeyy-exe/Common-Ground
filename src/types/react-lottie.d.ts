/**
 * `react-lottie` ships no type declarations, so TypeScript treats it as an
 * implicit `any` module (TS7016). This ambient declaration gives it a real
 * shape so the cast in `SdgIcon` is meaningful.
 *
 * Kept in its own file with no top-level import/export: that is what makes
 * `declare module` an ambient declaration rather than a module augmentation.
 * Props mirror the subset `SdgIcon` actually passes.
 */
declare module "react-lottie" {
  type LottieProps = {
    options: { loop?: boolean; autoplay?: boolean; animationData: object };
    height?: number | string;
    width?: number | string;
  };

  const Lottie: (props: LottieProps) => React.ReactElement | null;
  export default Lottie;
}