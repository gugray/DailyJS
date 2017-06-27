var zsnippets={"chunk-loginpanel":" <div class=\"loginPanel\"> <input type=\"password\" id=\"txtSecret\" placeholder=\"tell me a secret\" maxlength=\"32\" /> <input type=\"text\" id=\"txtResetEmail\" class=\"hidden\" placeholder=\"enter your email\" maxlength=\"64\" /> <i class=\"fa fa-arrow-right btnLoginGo disabled\"></i> <i class=\"fa fa-spinner fa-pulse fa-3x fa-fw icoEmailSending hidden\"></i> <span class=\"forgotSecret\">forgot?</span> </div> <div class=\"resetEmailFeedback popup\"> <div class=\"success\"> check your inbox: if <i>daily</i> knows your email, a message with a reset link has been sent to you. if you don't receive it within a few minutes, check your spam folder too. </div> <div class=\"fail\"> <b>ouch!</b> <i>daily</i> tried to send you a message with a reset link, but something went wrong. </div> <div class=\"close\"><span>close</span></div> </div> ","in-404":" <div class=\"content-badpage\"> <p class=\"main\"><span class=\"hilite\">404</span> - page not found ;-[</p> <a href=\"/\" class=\"ajax\">let's go home</a> </div> ","in-badcode":" <div class=\"content-badpage\"> <p class=\"main\">this link is <span class=\"hilite\">no good</span> ;-[</p> <p> maybe it has expired, or it was used before.<br /> or perhaps the code is wrong.<br /> (copy-paste error?) </p> <a href=\"/\" class=\"ajax\">let's go home</a> </div> ","in-login":" <div class=\"content-login\"> <p>you need to <span class=\"hilite\">log in</span> to see this page</p> {{loginpanel-inner}} </div> ","in-oops":" <div class=\"content-badpage\"> <p class=\"main\"><span class=\"hilite\">oops</span> ;-[ something went wrong</p> <a href=\"/\" class=\"ajax\">let's go home</a> </div> ","in-profile":" <div class=\"in-narrow\"> <div class=\"formRow defCity\"> <div class=\"label\">default city</div> <div class=\"field\"> <div class=\"value\"></div> </div> <div class=\"editor\"> <input type=\"text\" maxlength=\"32\" id=\"txtDefCity\" placeholder=\"default city\" /> <div class=\"cancelsave save\">save</div> <div class=\"cancelsave cancel\">cancel</div> <div class=\"progress\"><i class=\"fa fa-spinner fa-pulse fa-3x fa-fw\"></i></div> </div> <div class=\"commands\"><i class=\"fa fa-pencil\"></i></div> </div> <div class=\"formRow secret\"> <div class=\"label\">secret</div> <div class=\"field\"> <div class=\"value\"><i>only you know</i></div> </div> <div class=\"editor\"> <input type=\"password\" maxlength=\"32\" id=\"txtOldSecret\" placeholder=\"current secret\" /> <div class=\"error errOldSecret\">that doesn't seem to be the right secret</div> <div class=\"pwd-wrap\"> <input type=\"password\" maxlength=\"32\" id=\"txtNewSecret1\" placeholder=\"new secret\" /> <div class=\"showSecret\"><i class=\"fa fa-eye\"></i></div> </div> <div class=\"error errKnownSecret\">oy vey! someone else has discovered that secret before. please choose a different one.</div> <div class=\"error errNewSecret1\">need at least 8 characters, some uppercase, some digits</div> <div class=\"cancelsave save disabled\">save</div> <div class=\"cancelsave cancel\">cancel</div> <div class=\"progress\"><i class=\"fa fa-spinner fa-pulse fa-3x fa-fw\"></i></div> </div> <div class=\"commands\"><i class=\"fa fa-pencil\"></i></div> </div> <div class=\"formRow email\"> <div class=\"label\">email</div> <div class=\"field\"> <div class=\"value\"></div> </div> <div class=\"editor\"> <input type=\"text\" maxlength=\"32\" id=\"txtEmail\" placeholder=\"new email\" /> <div class=\"error errEmailExists\">this email is already in use</div> <input type=\"password\" maxlength=\"32\" id=\"txtSecretForEmail\" placeholder=\"your secret\" /> <div class=\"error errOldSecret\">that doesn't seem to be the right secret</div> <div class=\"cancelsave save disabled\">save</div> <div class=\"cancelsave cancel\">cancel</div> <div class=\"progress\"><i class=\"fa fa-spinner fa-pulse fa-3x fa-fw\"></i></div> </div> <div class=\"commands\"><i class=\"fa fa-pencil\"></i></div> </div> </div>","in-resetsecret":" <div class=\"content-mailcode\"> <p class=\"main\">reset your secret</p> <div class=\"resetSecret\"> <input type=\"password\" id=\"txtSecret\" placeholder=\"new secret\" maxlength=\"32\" /> <div class=\"showSecret\"><i class=\"fa fa-eye\"></i></div> <div class=\"error errKnownSecret\">oy vey! someone else has discovered that secret before.<br/>please choose a different one.</div> <div class=\"error errNewSecret\">need at least 8 characters,<br/>some uppercase, some digits</div> <div class=\"submit\">save</div> <i class=\"fa fa-spinner fa-pulse fa-fw icoResetProgress\"></i> </div> </div> ","in-resetsecret-ok":" <div class=\"content-mailcode\"> <p class=\"main\">welcome back</p> <p>you can now log in<br/>with your new secret.</p> <a href=\"/\" class=\"ajax\">let's go home</a> </div> ","in-slottaken":" <div class=\"content-badpage\"> <p class=\"main\"><span class=\"hilite\">ouch!</span> somebody just took this slot.</p> <a href=\"/inside/upload\" class=\"ajax\">back to upload page</a> </div> ","in-upload":" <div class=\"in-narrow upload\"> <div class=\"formRow city\"> <div class=\"label\">city</div> <div class=\"full-right\"> <input type=\"text\" maxlength=\"32\" id=\"txtCity\" placeholder=\"where you took the photo\" /> </div> </div> <div class=\"formRow date\"> <div class=\"label\">date</div> <div class=\"full-right\"> <div class=\"date-widget\"> <!--<div class=\"day disabled selected\">12/23<br/>mon</div>--> </div> </div> </div> <div class=\"formRow title\"> <div class=\"label\">title</div> <div class=\"full-right\"> <input type=\"text\" maxlength=\"64\" id=\"txtTitle\" placeholder=\"a title for your peecture\" /> </div> </div> <div class=\"formRow image\"> <div class=\"label\">peecture</div> <div class=\"full-right\"> <div class=\"upload-widget\"> <div class=\"progress\"></div> <div class=\"processing\"><i class=\"fa fa-spinner fa-pulse fa-3x fa-fw\"></i></div> <img class=\"uploadThumb\" alt=\"\" /> <div class=\"uploadHot\"> <input type=\"file\" accept=\".jpg,.jpeg\" id=\"fupload\" /> drag and drop jpeg image,<br /> or click to browse </div> </div> <div class=\"image-upload-info\"></div> </div> </div> <div class=\"formRow\"> <div class=\"label\"></div> <div class=\"full-right\"> <div class=\"btnGoToPreview\">go to preview</div> </div> </div> </div> ","sticker-all-inside":" <div class=\"sticker-inside\"> <a class=\"menu-item menuUpload ajax\" href=\"/inside/upload\"> <i class=\"fa fa-camera-retro\" aria-hidden=\"true\"></i> upload </a> <a class=\"menu-item menuHistory ajax\" href=\"/inside/history\"> <i class=\"fa fa-calendar\" aria-hidden=\"true\"></i> history </a> <a class=\"menu-item menuProfile ajax\" href=\"/inside/profile\"> <i class=\"fa fa-user\" aria-hidden=\"true\"></i> profile </a> <span class=\"enter\"><i class=\"fa fa-lightbulb-o\"></i></span> <i class=\"fa fa-sign-out menuSignout\" aria-hidden=\"true\"></i> <div class=\"welcome\"> hello, <span class=\"userName\">gabor</span>! </div> </div>","sticker-front":" <div class=\"stickerFront\"> <div class=\"menu\"> <a class=\"forward ajax disabled\" href=\"#\"><i class=\"fa fa-chevron-left\"></i></a> <a class=\"back ajax disabled\" href=\"#\"><i class=\"fa fa-chevron-right\"></i></a> <span class=\"enter\"><i class=\"fa fa-lightbulb-o\"></i></span> </div> <!-- loginpanel-inner --> <div class=\"photoMeta\"> <span class=\"date\"></span><br /><span class=\"city\"></span> &bull; <span class=\"poster\"></span> </div> <div class=\"photoTitle\"></div> </div> "}