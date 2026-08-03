import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // 빌드된 JS 파일은 dist/assets/js/index.js 로 고정 출력
        entryFileNames: 'assets/js/[name].js',
        // 빌드된 Chunk 파일은 dist/assets/js/[name].js 로 고정 출력
        chunkFileNames: 'assets/js/[name].js',
        // 빌드된 CSS 및 이미지 등 자산 이름 세분화 고정
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            // CSS는 dist/assets/css/index.css 로 고정 출력
            return 'assets/css/[name].[ext]';
          }
          
          // 이미지 파일 형식 필터링 및 dist/assets/images/ 폴더 분류
          const imgExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'];
          if (assetInfo.name && imgExtensions.some(ext => assetInfo.name.toLowerCase().endsWith(ext))) {
            return 'assets/images/[name]-[hash].[ext]';
          }

          // 사운드 파일 형식 필터링 및 dist/assets/sound/ 폴더 분류
          const soundExtensions = ['.mp3', '.wav', '.ogg', '.m4a'];
          if (assetInfo.name && soundExtensions.some(ext => assetInfo.name.toLowerCase().endsWith(ext))) {
            return 'assets/sound/[name]-[hash].[ext]';
          }
          
          // 기타 리소스
          return 'assets/[name]-[hash].[ext]';
        }
      }
    }
  }
});
