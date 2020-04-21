import webpack from 'webpack';
// import nodeExternals from 'webpack-node-externals';
import FriendlyErrorsWebpackPlugin from 'friendly-errors-webpack-plugin';
import { createBabelConfig } from './createBabelConfig';

export interface CreateWebpackConfigOptions {
  env: 'development' | 'production';
  projectPath: string;
  buildPath: string;
  publicBuildPath: string;
  entryPath: string;
}

// This is the Webpack configuration.
// It is focused on developer experience and fast rebuilds.
export function createWebpackConfig(options: CreateWebpackConfigOptions): webpack.Configuration {
  const mainBabelOptions = {
    babelrc: true,
    cacheDirectory: true,
    ...createBabelConfig(),
  };

  return {
    context: options.projectPath,
    // Webpack v4 add a mode configuration option tells webpack to use its
    // built-in optimizations accordingly.
    // @see https://webpack.js.org/concepts/mode/
    mode: options.env === 'development' ? 'development' : 'production',
    // Webpack can target multiple environments such as `node`,
    // `browser`, and even `electron`. Since Backpack is focused on Node,
    // we set the default target accordingly.
    target: 'node',
    // The benefit of Webpack over just using babel-cli or babel-node
    // command is sourcemap support. Although it slows down compilation,
    // it makes debugging dramatically easier.
    devtool: 'source-map',

    externals: [
      (_context, request, callback) => {
        const isRelative = request[0] === '.';
        const isPrivate = (request as string).startsWith('@lereacteur/');
        const isEntry = request === options.entryPath;
        if (isEntry || isRelative || isPrivate) {
          // console.log(`internal ${request}`);
          (callback as any)();
        } else {
          // external
          // console.log(`external ${request}`);
          callback(null, `commonjs ${request}`);
        }
      },
    ],

    // externals: [
    //   nodeExternals({
    //     modulesFromFile: true,
    //     whitelist: [
    //       /\.(eot|woff|woff2|ttf|otf)$/,
    //       /\.(svg|png|jpg|jpeg|gif|ico|webm)$/,
    //       /\.(mp4|mp3|ogg|swf|webp)$/,
    //       /\.(css|scss|sass|less|styl)$/,
    //     ],
    //   }),
    // ],
    // As of Webpack 2 beta, Webpack provides performance hints.
    // Since we are not targeting a browser, bundle size is not relevant.
    // Additionally, the performance hints clutter up our nice error messages.
    performance: {
      hints: false,
    },
    // Since we are wrapping our own webpack config, we need to properly resolve
    // Backpack's and the given user's node_modules without conflict.
    resolve: {
      extensions: ['.js', '.ts', '.json'],
    },
    resolveLoader: {},
    node: {
      __filename: true,
      __dirname: true,
    },
    entry: {
      main: [options.entryPath],
    },
    // This sets the default output file path, name, and compile target
    // module type. Since we are focused on Node.js, the libraryTarget
    // is set to CommonJS2
    output: {
      path: options.buildPath,
      filename: '[name].js',
      sourceMapFilename: '[name].map',
      publicPath: options.publicBuildPath,
      libraryTarget: 'commonjs2',
    },
    // Define a few default Webpack loaders. Notice the use of the new
    // Webpack 2 configuration: module.rules instead of module.loaders
    module: {
      rules: [
        // Process JS with Babel (transpiles ES6 code into ES5 code).
        {
          test: /\.(js|ts|jsx)$/,
          loader: require.resolve('babel-loader'),
          exclude: [/node_modules/, options.buildPath],
          options: mainBabelOptions,
        },
      ],
    },
    // A few commonly used plugins have been removed from Webpack v4.
    // Now instead, these plugins are avaliable as "optimizations".
    // @see https://webpack.js.org/configuration/optimization/
    optimization: {
      // optimization.noEmitOnErrors prevents Webpack
      // The NoEmitOnErrorsPlugin plugin prevents Webpack
      // from printing out compile time stats to the console.
      noEmitOnErrors: true,
    },
    plugins: [
      // We define some sensible Webpack flags. One for the Node environment,
      // and one for dev / production. These become global variables. Note if
      // you use something like eslint or standard in your editor, you will
      // want to configure __DEV__ as a global variable accordingly.
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(options.env),
        __DEV__: options.env === 'development',
      }),
      // In order to provide sourcemaps, we automagically insert this at the
      // top of each file using the BannerPlugin.
      new webpack.BannerPlugin({
        raw: true,
        entryOnly: false,
        banner: `require('${
          // Is source-map-support installed as project dependency, or linked?
          require.resolve('source-map-support').indexOf(process.cwd()) === 0
            ? // If it's resolvable from the project root, it's a project dependency.
              'source-map-support/register'
            : // It's not under the project, it's linked via lerna.
              require.resolve('source-map-support/register')
        }');`,
      }),
      // The FriendlyErrorsWebpackPlugin (when combined with source-maps)
      // gives Backpack its human-readable error messages.
      new FriendlyErrorsWebpackPlugin({
        clearConsole: options.env === 'development',
      }),
    ],
  };
}
