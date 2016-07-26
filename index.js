
/**基于 FIS3 配置目录规范和部署规范 */ 

var fis = module.exports = require('fis3');
fis.require.prefixes.unshift('cooker');
fis.cli.name = 'cooker';
fis.cli.info = require('./package.json');
fis.cli.version = require('./version.js');

// 按需编译。
fis.set('project.files', ['/src/index.html', 'map.json','/mock/**']);
// 设置忽略的目录
fis.get('project.ignore').push('/prod/**');

//fis3-hook-commonjs, // 模块化支持 commonjs 规范，适应 mod.js
fis.hook('commonjs', {
  baseUrl: './src/modules',
  extList: ['.js', '.jsx']
});

// 改用 npm 方案，而不是用 fis-components
fis.unhook('components');
fis.hook('node_modules',{
  //env: JSON.stringify("development"), // 永远都替换成 development  、 production
  ignoreDevDependencies: true // 忽略掉 dev 模块，可以提速。
});

// mock目录不做require解析
fis.match("/mock/**.js", {
  ignoreDependencies: true
})

// src目录下的发布到根目录
fis.match('/src/(**)', {
    release: '/$1'
})

// index.html设置
fis.match('/src/index.html', {
    release: '/index.html',
    parser: false,
    useCache: false
})

// less编译
fis.match('*.less', {
  parser: fis.plugin('less'),
  rExt: '.css'
});

// babel编译ES6
fis.match('{*.jsx,/src/modules/**.js}', {
  rExt: 'js',
  parser: fis.plugin('babel-5.x', {
    optional: ["es7.decorators", "es7.classProperties","es7.functionBind"]
  },{
    presets: ["es2015", "react", "stage-0"]
  })
});

// 模块化 js
fis.match('/{node_modules,src/modules}/**.{js,jsx}', {
  isMod: true
});

// 添加css和image加载支持
fis.match('*.{js,jsx}', {
    preprocessor: [
      fis.plugin('js-require-css'),
      fis.plugin('js-require-file', {
        useEmbedWhenSizeLessThan: 10 * 1024 // 小于10k用base64
      })
    ]
})

// 转换为es3, 兼容IE8
fis.match('/node_modules/**.js', {
    parser: fis.plugin("translate-es3ify")
})

// 第三方js太多了，合并下
fis.match('/node_modules/**.js', {
    //optimizer: fis.plugin('uglify-js'),
    packTo: '/static/pkg/vendor.js'
})

//  用 loader 来自动引入资源。
fis.match('::package', {
  // spriter: fis.plugin('csssprites'),  // 雪碧图
  postpackager: fis.plugin('loader', {
      useInlineMap: true
      //allInOne: true,
  })
});

// ======= 在 prod 环境下，开启各种压缩和打包 =============
fis.media('prod')
  .match('*.{js, css, less, sass, scss}', { // 所有js, css 加 hash
    useHash: true
  })
  .match('::image', {  // 所有图片加 hash
    useHash: true
  })
  .match('*.{js,jsx}', {
   optimizer: fis.plugin('uglify-js')
  })
  .match('*.{css, less, sass, scss}', {
    optimizer: fis.plugin('clean-css')
  })
  .match('*.png', {
    optimizer: fis.plugin('png-compressor')
  })