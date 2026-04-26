export default function Container({ children, className = '', as: Tag = 'div', ...props }) {
  return (
    <Tag
      className={`mx-auto w-full max-w-[1440px] px-6 md:px-12 lg:px-20 grid grid-cols-12 gap-6 md:gap-8 ${className}`}
      {...props}
    >
      {children}
    </Tag>
  )
}
