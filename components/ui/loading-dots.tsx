export const LoadingDots = () => {
  return (
    <span className="inline-flex items-center">
      <span className="animate-[loading_1.4s_ease-in-out_infinite] rounded-full h-1 w-1 mx-0.5 bg-current" />
      <span className="animate-[loading_1.4s_ease-in-out_0.2s_infinite] rounded-full h-1 w-1 mx-0.5 bg-current" />
      <span className="animate-[loading_1.4s_ease-in-out_0.4s_infinite] rounded-full h-1 w-1 mx-0.5 bg-current" />
    </span>
  );
};