const DecorativeBlobs = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Large primary blob */}
      <div 
        className="absolute -top-24 -right-24 w-80 h-80 md:w-[500px] md:h-[500px] rounded-full gradient-blob opacity-40 blur-3xl animate-blob"
      />
      
      {/* Secondary blob */}
      <div 
        className="absolute -bottom-32 -left-32 w-72 h-72 md:w-96 md:h-96 rounded-full gradient-blob opacity-30 blur-3xl animate-blob-delayed"
      />
      
      {/* Small accent blob */}
      <div 
        className="absolute top-1/3 left-1/4 w-32 h-32 md:w-48 md:h-48 rounded-full bg-accent opacity-50 blur-2xl animate-blob"
      />
    </div>
  );
};

export default DecorativeBlobs;
