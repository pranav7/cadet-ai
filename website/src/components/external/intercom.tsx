'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    Intercom: any;
    intercomSettings: {
      api_base: string;
      app_id: string;
      user_id?: string;
      name?: string;
      email?: string;
      created_at?: number;
    };
  }
}

type IntercomUser = {
  id?: string;
  name?: string;
  email?: string;
  createdAt?: number;
};

interface IntercomFunction extends Function {
  c: (args: IArguments) => void;
  q: any[];
}

export default function Intercom({ user }: { user?: IntercomUser }) {
  useEffect(() => {
    // Initialize Intercom settings
    window.intercomSettings = {
      api_base: "https://api-iam.intercom.io",
      app_id: "zfmc7m57",
      ...(user?.id && { user_id: user.id }),
      ...(user?.name && { name: user.name }),
      ...(user?.email && { email: user.email }),
      ...(user?.createdAt && { created_at: user.createdAt }),
    };

    // Load Intercom script
    (function() {
      var w = window;
      var ic = w.Intercom;
      if (typeof ic === "function") {
        ic('reattach_activator');
        ic('update', w.intercomSettings);
      } else {
        var d = document;
        var i = (function() {
          function i(this: IntercomFunction) {
            i.c(arguments);
          }
          i.q = [];
          i.c = function(args) {
            i.q.push(args);
          };
          return i;
        })() as unknown as IntercomFunction;

        w.Intercom = i;
        var l = function() {
          var s = d.createElement('script');
          s.type = 'text/javascript';
          s.async = true;
          s.src = 'https://widget.intercom.io/widget/zfmc7m57';
          var x = d.getElementsByTagName('script')[0];
          if (x && x.parentNode) {
            x.parentNode.insertBefore(s, x);
          }
        };
        if (document.readyState === 'complete') {
          l();
        } else {
          w.addEventListener('load', l, false);
        }
      }
    })();

    // Cleanup function
    return () => {
      if (window.Intercom) {
        window.Intercom('shutdown');
      }
    };
  }, [user]);

  return null;
}
