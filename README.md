LiveStyl
========

Apply live CSS to any page. To use, create a .styl file somewhere and then

    node livestyl.js yourfile.styl

And then navigate to

    http://localhost:25531/

and bookmark the bookmarklet. Now navigate to any page and click the bookmarklet, the styles from `yourfile.styl` will
be applied to that page. If you modify that file, the CSS will be reloaded automatically.


Dependencies
------------

* express
* stylus
